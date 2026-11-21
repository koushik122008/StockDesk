import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, ensureSqlitePragmas } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const currentUserRole = (session?.user as any)?.role;

    const { id } = await params;
    const isSelf = currentUserId === id;
    const isAdmin = currentUserRole === "ADMIN";

    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, role, active, password } = body;

    const updateData: any = {};
    if (name && name.trim()) {
      updateData.name = name.trim();
    }

    // Only Admin can change roles and active status
    if (isAdmin) {
      if (role && ["ADMIN", "MANAGER", "STAFF"].includes(role)) {
        updateData.role = role;
      }
      if (typeof active === "boolean") {
        updateData.active = active;
      }
    }

    // Password reset if supplied
    if (password && password.trim()) {
      updateData.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (err: any) {
    console.error("User update error:", err);
    return NextResponse.json({ error: err.message || "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSqlitePragmas();
    const session = await getServerSession(authOptions);
    const currentUserRole = (session?.user as any)?.role;
    const currentUserId = (session?.user as any)?.id;

    if (currentUserRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const { id } = await params;

    if (id === currentUserId) {
      return NextResponse.json({ error: "Cannot delete or deactivate your own account" }, { status: 400 });
    }

    // Soft deactivate user
    await prisma.user.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to deactivate user" }, { status: 500 });
  }
}
