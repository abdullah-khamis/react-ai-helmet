// These FAQs live in a data module — i.e. a *variable*. When a page passes them
// as items={pricingFaqs}, the static scanner cannot read them (resolving the
// variable would mean executing this module). The collection pass captures them
// by rendering the component for real.
export const pricingFaqs = [
  {
    question: 'How much does ProjectFlow cost?',
    answer:
      'Free for up to 5 users; Pro is $9 per user/month; Team is $29/month for unlimited users.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Pro and Team include a 14-day free trial — no credit card required.',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes. Upgrade or downgrade anytime; changes are prorated automatically.',
  },
]
