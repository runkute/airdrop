import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: { userId: string } };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const record = await prisma.userCredits.findUnique({
    where: { userId: params.userId },
    select: { balance: true },
  });

  return NextResponse.json({ balance: record?.balance ?? 0 });
}
