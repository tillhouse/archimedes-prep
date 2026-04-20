import prisma from "./prisma";

export interface EntitlementStatus {
  allowed: boolean;
  isFree: boolean;
  paidRemaining: number;
}

export async function checkEntitlement(userId: string): Promise<EntitlementStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { reviewsPurchased: true, reviewsUsed: true, freeReviewUsed: true },
  });

  if (!user) {
    return { allowed: false, isFree: false, paidRemaining: 0 };
  }

  const paidRemaining = user.reviewsPurchased - user.reviewsUsed;

  if (paidRemaining > 0) {
    return { allowed: true, isFree: false, paidRemaining };
  }

  if (!user.freeReviewUsed) {
    return { allowed: true, isFree: true, paidRemaining: 0 };
  }

  return { allowed: false, isFree: false, paidRemaining: 0 };
}

export async function consumeEntitlement(
  userId: string,
  isFree: boolean
): Promise<void> {
  if (isFree) {
    await prisma.user.update({
      where: { id: userId },
      data: { freeReviewUsed: true },
    });
  } else {
    await prisma.user.update({
      where: { id: userId },
      data: { reviewsUsed: { increment: 1 } },
    });
  }
}
