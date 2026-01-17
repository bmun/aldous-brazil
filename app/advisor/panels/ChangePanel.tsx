function ChangePanel () {

    return (
        <div className="bg-black w-full border-2 border-primary rounded-2xl p-4 overflow-scroll">
            <p className="text-2xl">
                If your delegation needs to request any changes (e.g. adding, dropping, or requesting a refund)
                please fill 
                out <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLSfHGCZhaXmrNYyuJV1uaff0RtNNYmRsEq61mjgyi_OdGXiQKg/viewform">
                    <span 
                    className="text-primary font-bold underline">
                        this form
                    </span>
                </a>. 
            </p>
        </div>
    )
}

export default ChangePanel;