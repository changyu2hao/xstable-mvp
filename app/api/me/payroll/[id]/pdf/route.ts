import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { PDFDocument, StandardFonts } from "pdf-lib";

export const runtime = "nodejs";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

function formatMoneyUSDC(v: string | number) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(2);
}

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  // 统一用 UTC 或本地都可以；这里用 ISO 更“审计友好”
  return d.toISOString().replace("T", " ").replace("Z", " UTC");
}

async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function GET(req: Request, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve(ctx.params);

    if (!id || !isUuid(id)) {
      return NextResponse.json({ error: "Invalid payslip id" }, { status: 400 });
    }

    const supabase = await supabaseServer();

    // 1) 必须已登录
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2) user -> employee
    const { data: employee } = await supabase
      .from("employees")
      .select("id, name, email, wallet_address")
      .eq("user_id", user.id)
      .single();

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 403 });
    }

    // 3) payslip 必须属于该 employee
    const { data: item, error: itemErr } = await supabase
      .from("payroll_items")
      .select("id, employee_id, amount_usdc, status, tx_hash, created_at, paid_at, batch_id")
      .eq("id", id)
      .eq("employee_id", employee.id)
      .single();

    if (itemErr || !item) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    // ✅ 4) 只允许 paid 导出（你想更宽松的话，可以改成允许 pending 但加水印）
    if (item.status !== "paid") {
      return NextResponse.json(
        { error: "Payslip is not available until it is paid." },
        { status: 409 }
      );
    }

    // 5) PDF：更像 payslip 的排版（两列 + 分隔线 + 大金额）
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const marginX = 50;
    let y = 800;

    // 标题
    page.drawText("XStable Payslip", { x: marginX, y, size: 20, font: bold });
    y -= 18;
    page.drawText(`Payslip ID: ${item.id}`, { x: marginX, y, size: 10, font });
    y -= 18;

    // 分隔线（用短横线模拟）
    page.drawText(
      "------------------------------------------------------------",
      {
        x: marginX,
        y,
        size: 12,
        font,
      }
    );
    y -= 24;

    // 左右两列
    const leftX = marginX;
    const rightX = 320;

    const left = [
      ["Employee", employee.name ?? "—"],
      ["Email", employee.email ?? "—"],
      ["Wallet", employee.wallet_address ?? "—"],
    ] as const;

    const right = [
      ["Amount (USDC)", formatMoneyUSDC(item.amount_usdc)],
      ["Status", item.status],
      ["Paid At", formatDate(item.paid_at)],
      ["Created At", formatDate(item.created_at)],
    ] as const;

    let yLeft = y;
    for (const [k, v] of left) {
      page.drawText(k, { x: leftX, y: yLeft, size: 10, font: bold });
      yLeft -= 14;
      // wallet 可能很长：拆两行
      if (k === "Wallet" && v.length > 38) {
        page.drawText(v.slice(0, 38), { x: leftX, y: yLeft, size: 10, font });
        yLeft -= 12;
        page.drawText(v.slice(38), { x: leftX, y: yLeft, size: 10, font });
      } else {
        page.drawText(v, { x: leftX, y: yLeft, size: 10, font });
      }
      yLeft -= 14;
    }

    let yRight = y;
    for (const [k, v] of right) {
      page.drawText(k, { x: rightX, y: yRight, size: 10, font: bold });
      yRight -= 18;
      const isAmount = k === "Amount (USDC)";
      page.drawText(v, { x: rightX, y: yRight, size: isAmount ? 18 : 10, font: isAmount ? bold : font });
      yRight -= isAmount ? 24 : 28;
    }

    // Tx hash
    const yTx = Math.min(yLeft, yRight) - 10;
    page.drawText("Transaction", { x: marginX, y: yTx, size: 10, font: bold });
    const tx = item.tx_hash ?? "—";
    const txY = yTx - 14;
    // tx 拆行
    const chunk = 52;
    for (let i = 0; i < tx.length; i += chunk) {
      page.drawText(tx.slice(i, i + chunk), { x: marginX, y: txY - (i / chunk) * 12, size: 10, font });
    }

    // Footer
    page.drawText("Generated by XStable • This document is provided for your records.", {
      x: marginX,
      y: 40,
      size: 9,
      font,
    });

    const pdfBytes = await pdfDoc.save();

    // 6) 下载体验 & 安全 headers
    const fileName = `payslip-${item.id}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate payslip PDF", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
