import { auth } from "@/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { prisma } from "@/lib/prisma";
import { DOCTOR_ID, formatDateInput } from "@/lib/schedule";
import "@/app/admin-ui.css";

function dateOnly(value: Date) {
  return new Date(`${formatDateInput(value)}T00:00:00Z`);
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const today = dateOnly(new Date());

  const [bookingCount, messageCount] = await Promise.all([
    prisma.bookings.count({
      where: {
        doctor_id: DOCTOR_ID,
        status: "tentative",
        payment_status: "unpaid",
        date: { gte: today },
      },
    }),
    prisma.contact_messages.count({ where: { status: "new" } }),
  ]);

  return (
    <AdminShell
      userName={session?.user?.name ?? "Admin"}
      userEmail={session?.user?.email}
      bookingCount={bookingCount}
      messageCount={messageCount}
    >
      {children}
    </AdminShell>
  );
}
