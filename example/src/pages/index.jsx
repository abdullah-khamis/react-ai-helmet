import { AIHelmet, OrgSchema, FAQSchema, AIRegion } from 'react-ai-helmet'

export default function Home() {
  return (
    <AIHelmet
      siteName="ProjectFlow"
      siteUrl="https://projectflow.example"
      siteDescription="Project management built for remote teams"
      llmsTitle="Home"
      llmsDescription="ProjectFlow — project management built for remote teams"
    >
      <OrgSchema email="hello@projectflow.example" sameAs={['https://twitter.com/projectflow']} />

      <AIRegion type="summary">
        ProjectFlow helps remote teams plan, track, and ship work without endless meetings.
      </AIRegion>

      {/* Inline literal — the static scanner reads this one directly. */}
      <FAQSchema
        items={[
          { question: 'What is ProjectFlow?', answer: 'A project management tool for distributed teams.' },
          { question: 'Do you have a mobile app?', answer: 'Yes, on iOS and Android.' },
        ]}
      />
    </AIHelmet>
  )
}
