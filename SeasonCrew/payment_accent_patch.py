from pathlib import Path
import re

css_path = Path('SeasonCrew/brand-v2.css')
css = css_path.read_text(encoding='utf-8')

start = '/* payment-attention-v1:start */'
end = '/* payment-attention-v1:end */'
css = re.sub(re.escape(start) + r'.*?' + re.escape(end), '', css, flags=re.S)
payment_block = '''/* payment-attention-v1:start */
/* Raspberry is reserved for prices, unpaid states and attention CTAs. */
#nextMatchBtn,
#openPayments{
  background:#E14975!important;
  border-color:#E14975!important;
  color:#fff!important;
  box-shadow:0 8px 20px rgba(225,73,117,.22)!important;
}
#nextMatchBtn:hover,
#openPayments:hover{
  background:#C83260!important;
  border-color:#C83260!important;
  color:#fff!important;
}

.ticketCard.assigned.unpaid,
.ticketCard.unpaid{
  background:#E14975!important;
  border-color:#E14975!important;
  color:#fff!important;
  box-shadow:0 8px 20px rgba(225,73,117,.15)!important;
}
.ticketCard.unpaid .ticketHead b,
.ticketCard.unpaid .ticketActions,
.ticketCard.unpaid .paidToggle{
  color:#fff!important;
}
.ticketCard.unpaid .ticketActions{
  border-top-color:rgba(255,255,255,.35)!important;
}
.ticketCard.unpaid .ticketActions button{
  color:#fff!important;
  border-right-color:rgba(255,255,255,.35)!important;
}
.ticketCard.unpaid .releaseBtn{
  color:#fff!important;
  border-color:rgba(255,255,255,.45)!important;
}

.fixturePriceV2{
  background:#E14975!important;
  border-color:#E14975!important;
  color:#fff!important;
}
.fixturePriceV2:not([data-price]){
  background:#FFF4F7!important;
  border-color:#F0B7C8!important;
  color:#9F2449!important;
}
#statUnpaid,
.paymentRulePriceHint,
.myTicketPay strong,
.paymentPersonAmount.open strong,
.paymentsSummary strong{
  color:#E14975!important;
}
.myTicketCard.unpaid{
  border-color:#E14975!important;
  background:#FFF4F7!important;
}
.myTicketCard.unpaid .myTicketPay span{
  color:#C83260!important;
}
/* payment-attention-v1:end */'''

paid_start = '/* paid-success-v1:start */'
paid_end = '/* paid-success-v1:end */'
css = re.sub(re.escape(paid_start) + r'.*?' + re.escape(paid_end), '', css, flags=re.S)
paid_block = '''/* paid-success-v1:start */
/* Paid tickets use a calm emerald green that complements raspberry #E14975. */
.ticketCard.assigned.paid,
.ticketCard.paid{
  background:#2F8A62!important;
  border:2px solid #2F8A62!important;
  color:#fff!important;
  box-shadow:0 8px 20px rgba(47,138,98,.18)!important;
}
.ticketCard.paid .ticketHead b,
.ticketCard.paid .ticketHead small,
.ticketCard.paid .ticketActions,
.ticketCard.paid .paidToggle{
  color:#fff!important;
}
.ticketCard.paid .ticketHead small,
.ticketCard.paid .ticketSeatBadge{
  background:rgba(255,255,255,.14)!important;
  border-color:rgba(255,255,255,.34)!important;
  color:#fff!important;
}
.ticketCard.paid .attendeeInput{
  background:rgba(255,255,255,.12)!important;
  border-color:rgba(255,255,255,.34)!important;
  color:#fff!important;
}
.ticketCard.paid .attendeeInput::placeholder{color:rgba(255,255,255,.72)!important}
.ticketCard.paid .releaseBtn{
  background:rgba(255,255,255,.12)!important;
  border-color:rgba(255,255,255,.40)!important;
  color:#fff!important;
}
.ticketCard.paid .ticketActions{border-top-color:rgba(255,255,255,.30)!important}
.ticketCard.paid .ticketActions button{
  color:#fff!important;
  border-right-color:rgba(255,255,255,.30)!important;
}
.ticketCard.paid .paidToggle input{accent-color:#fff!important}

.myTicketCard.paid{
  background:#2F8A62!important;
  border-color:#2F8A62!important;
  color:#fff!important;
}
.myTicketCard.paid small,
.myTicketCard.paid b,
.myTicketCard.paid span,
.myTicketCard.paid strong,
.myTicketCard.paid .myTicketPay span{
  color:#fff!important;
}
.gameCard.allPaid{
  border-color:#2F8A62!important;
  background:#F1FAF5!important;
}
/* paid-success-v1:end */'''

css_path.write_text(css.rstrip() + '\n\n' + payment_block + '\n\n' + paid_block + '\n', encoding='utf-8')

index_path = Path('SeasonCrew/index.html')
html = index_path.read_text(encoding='utf-8')
html = re.sub(r'brand-v2\.css\?v=[^"\']+', 'brand-v2.css?v=20260817-paidgreen1', html)
html = re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User', 'Pilot V1 · Build calm-saas-2c · Multi-User', html)
index_path.write_text(html, encoding='utf-8')
