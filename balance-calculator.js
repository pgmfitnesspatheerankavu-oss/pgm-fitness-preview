export function calculateBalanceDue(member, payments, asOf) {
  if (!member) return 0;
  // Support both current cloud fields and common legacy fee field names.
  const planFee = Number(member.planFee ?? member.membershipFee ?? member.feeAmount ?? member.fee ?? 0);
  const firstRegistration = !member.planStartDate || member.planStartDate === member.joinDate;
  const registrationFee = firstRegistration ? Number(member.registrationFee || 0) : 0;
  const fee = planFee + (Number.isFinite(registrationFee) ? registrationFee : 0);
  if (!Number.isFinite(fee) || fee <= 0) return 0;

  const cycleStart = member.planStartDate || member.joinDate || "0000-01-01";
  const memberPhone = String(member.phone || "").replace(/\\D/g, "");
  const paid = (payments || [])
    .filter(p => {
      // Never count manually entered income/opening-balance records as member fees.
      if (p.type === "other-income" || p.type === "opening-balance") return false;
      const paymentMemberId = p.memberId || p.memberKey || "";
      const sameMember = paymentMemberId
        ? paymentMemberId === member.id
        : (memberPhone && String(p.phone || "").replace(/\\D/g, "") === memberPhone);
      const paymentDate = p.date || p.paymentDate || "";
      return sameMember && paymentDate >= cycleStart && paymentDate <= asOf;
    })
    .reduce((sum, p) => sum + Math.max(0, Number(p.amount) || 0), 0);

  return Math.max(0, fee - paid);
}
