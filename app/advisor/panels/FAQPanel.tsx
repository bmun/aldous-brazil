import { useRouter } from "next/navigation";

const faqs = [
    {
        question: "When can I register for conference?",
        answer: "The registration button will be made avaliable during open registration periods. For the exact dates, navigate to the timeline on the right side of the page."
    },
    {
        question: "How do the fees work?",
        answer: "During the initial round, each delegate is required to pay a fee of 90 USD. During round 2, each delegate is required to pay a fee of 105 USD."
    },
    {
        question: "What do I do if I want to add or drop delegates?",
        answer: "To add or drop delegates from your registration, contact us at info@bmun.org and tech@bmun.org. We will provide you with a response within 5 business days. Delegations are currently limited to 50 spots, but we will provide an opportunity to add more after round 1."
    },
]

function FAQPanel() {
    const router = useRouter();
    
    return (
        <div className="bg-black flex flex-col w-full p-4 border-2 border-primary rounded-2xl">
            <h2 className="text-7xl">FAQs</h2>
            <div className="join join-vertical bg-black text-xl rounded-xl">
                <div className="collapse collapse-arrow join-item bg-base-300 border border-base-100" key={-1}>
                    <input type="radio" name="my-accordion-1" defaultChecked />
                    <div className="collapse-title font-semibold">How do I reset my password?</div>
                    <div className="collapse-content text-md hover:cursor-pointer text-primary font-bold" onClick={() => router.push('/reset-password')}>Click Here</div>
                </div>
                {faqs.map((faq, index) => (
                    <div className="collapse collapse-arrow join-item bg-base-300 border border-base-100" key={index}>
                        <input type="radio" name="my-accordion-1" />
                        <div className="collapse-title font-semibold">{faq.question}</div>
                        <div className="collapse-content text-md">{faq.answer}</div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default FAQPanel;