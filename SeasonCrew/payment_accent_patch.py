from pathlib import Path
import re

css_path = Path('SeasonCrew/brand-v2.css')
css = css_path.read_text(encoding='utf-8')
start = '/* payment-attention-v1:start */'
end = '/* payment-attention-v1:end */'
css = re.sub(re.escape(start) + r'.*?' + re.escape(end), '', css, flags=re.S)
block = '''/* payment-attention-v1:start */
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
css_path.write_text(css.rstrip() + '\n\n' + block + '\n', encoding='utf-8')

index_path = Path('SeasonCrew/index.html')
html = index_path.read_text(encoding='utf-8')
html = re.sub(r'brand-v2\.css\?v=[^"\']+', 'brand-v2.css?v=20260817-attention1', html)
html = re.sub(r'Pilot V1 · Build [^·<]+ · Multi-User', 'Pilot V1 · Build calm-saas-2b · Multi-User', html)
index_path.write_text(html, encoding='utf-8')
