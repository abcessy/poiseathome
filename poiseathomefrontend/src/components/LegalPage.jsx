import React from 'react';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';

const LegalPage = ({ title, introduction, sections }) => (
  <div className="min-h-screen bg-background">
    <PublicHeader />
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <header className="border-b border-gray-200 pb-8">
        <p className="text-sm font-bold uppercase tracking-[.14em] text-primary-purple">PoiseAtHome legal</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-text-main sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-3xl leading-7 text-text-muted">{introduction}</p>
        <p className="mt-4 text-sm font-medium text-text-muted">Last updated: August 22, 2026</p>
      </header>
      <div className="mt-10 space-y-10">
        {sections.map(({ heading, paragraphs, items }) => (
          <section key={heading}>
            <h2 className="text-xl font-bold tracking-tight text-text-main">{heading}</h2>
            {paragraphs?.map(paragraph => <p key={paragraph} className="mt-3 leading-7 text-text-muted">{paragraph}</p>)}
            {items && <ul className="mt-4 list-disc space-y-2 pl-6 leading-7 text-text-muted">{items.map(item => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
      </div>
    </main>
    <PublicFooter />
  </div>
);

export default LegalPage;
