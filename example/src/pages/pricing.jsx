import { AIHelmet, ProductSchema, FAQSchema, AIRegion } from 'react-ai-helmet'
import { pricingFaqs } from '../data/faqs.js'

const proPlan = {
  name: 'Pro',
  price: 9,
  blurb:
    'Pro adds unlimited projects, priority support, and advanced reporting on top of the Free plan.',
}

// A custom component whose text only exists *after* it renders. A tree-walk
// can't read it; HTML extraction captures it because it reads rendered output.
function PlanBlurb({ plan }) {
  return <>{plan.blurb}</>
}

export default function Pricing() {
  return (
    <AIHelmet
      llmsTitle="Pricing"
      llmsDescription="Plans and pricing for ProjectFlow"
      llmsPriority="high"
    >
      {/* Dynamic price — the value comes from data, not a literal prop, so the
          static scanner can't read it. The collection pass resolves it. */}
      <ProductSchema name={proPlan.name} price={proPlan.price} currency="USD" availability="InStock" />

      {/* Region content produced by a child component — the static scanner
          sees nothing, and even a children tree-walk couldn't read it. HTML
          extraction captures it because it reads the rendered output. */}
      <AIRegion type="summary"><PlanBlurb plan={proPlan} /></AIRegion>

      <AIRegion type="definition" term="Seat">
        One billable team member with full access to the workspace.
      </AIRegion>

      {/* Dynamic items — from a variable. Static scan can't read these; the
          collection pass captures them. */}
      <FAQSchema items={pricingFaqs} />
    </AIHelmet>
  )
}
