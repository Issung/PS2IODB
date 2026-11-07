import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { IconChevronRight } from '@tabler/icons-react';
import './FaqQuestion.scss';

interface FaqQuestionProps {
    /** Used as the element id, so `/faq#<id>` links to (and opens) this question. */
    id: string;
    question: string;
    children: ReactNode;
}

/**
 * A question on the FAQ page, collapsed to just the question until clicked.
 * Uses `<details>` so it works with the keyboard and screen readers, and find-in-page can open it.
 */
const FaqQuestion = (props: FaqQuestionProps) => {
    const { hash } = useLocation();

    /**
     * Put the open question in the address bar, so it can be copied to link someone to it.
     * Uses the History API directly rather than navigating, which would make `HashScroller` scroll the page. The
     * existing state is kept because React Router stores its own data in it.
     */
    const onToggle = (e: React.ToggleEvent<HTMLDetailsElement>) => {
        const { pathname, search } = window.location;
        if (e.currentTarget.open) {
            window.history.replaceState(window.history.state, '', `${pathname}${search}#${props.id}`);
        } else if (window.location.hash === `#${props.id}`) {
            window.history.replaceState(window.history.state, '', `${pathname}${search}`);
        }
    };

    return (
        <details id={props.id} className="faq-question" open={hash === `#${props.id}`} onToggle={onToggle}>
            <summary>
                <IconChevronRight className="chevron" size={20} aria-hidden />
                <h4>{props.question}</h4>
            </summary>
            <div className="answer">
                {props.children}
            </div>
        </details>
    );
};

export default FaqQuestion;
