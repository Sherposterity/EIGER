import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FadeIn } from './motion';
import { focusRing } from './utils';

const SUPPORT_EMAIL = 'support@eiger014.com';

const inlineLink = `rounded-sm text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg ${focusRing}`;

const QUESTIONS = [
  {
    id: 'verified',
    q: 'How exactly is gear verified?',
    a: (
      <>
        We have a team of experts meticulously verifying fine-tuned SOTA agents.{' '}
        See our{' '}
        <Link to="/verification" className={inlineLink}>
          verification process
        </Link>{' '}
        for more info.
      </>
    ),
  },
  {
    id: 'pro',
    q: 'What does Pro offer?',
    a: 'You are not only able to see your overall gear readiness, but your mountain specific compatibility for every single mountain in our database.',
  },
  {
    id: 'platforms',
    q: 'Is this available to both Apple and Android?',
    a: 'Yes! Available on Android and iOS today!',
  },
];

const Faq = () => (
  <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-16 border-t border-line bg-bg py-section">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.4fr] lg:gap-16 lg:px-8">
      <FadeIn>
        <h2 id="faq-heading" className="font-display text-display-lg text-fg">
          Questions
        </h2>
      </FadeIn>

      <div>
        <Accordion type="single" collapsible className="border-t border-line">
          {QUESTIONS.map(({ id, q, a }) => (
            <AccordionItem key={id} value={id} className="border-b border-line">
              <AccordionTrigger className="items-center py-6 font-display text-heading text-fg hover:no-underline focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-bg **:data-[slot=accordion-trigger-icon]:size-5">
                {q}
              </AccordionTrigger>
              <AccordionContent className="pb-6 text-body-lg text-fg-muted">
                <p className="max-w-2xl">{a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-8 text-body text-fg-muted">
          Have more questions? Hit{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={inlineLink}>
            {SUPPORT_EMAIL}
          </a>{' '}
          and we&apos;ll answer.
        </p>
      </div>
    </div>
  </section>
);

export default Faq;
