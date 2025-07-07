import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Contact Us | GND Millwork",
};

export default async function ContactUsPage() {
    const list = {
        opening: {
            title: "Store Hours",
            rows: ["Mon – Fri: 7:30am – 4:30pm", "Sat & Sun: Closed"],
        },
        call: {
            title: "Call or Text",
            rows: [
                { phone: "(305) 278-6555", type: "General" },
                { phone: "(305) 278-6555", type: "Returns" },
                { phone: "(305) 278-6555", type: "Accounts" },
            ],
        },
        email: [
            "sales@gndmillwork.com",
            "support@gndmillwork.com",
            "accounts@gndmillwork.com",
        ],
    };
    return (
        <div className="min-h-screen bg-gradient-to-tr from-sky-200/30 to-sky-200/25 ">
            <div className="mx-auto max-w-7xl">
                <div className="my-16 grid gap-4 sm:gap-10 sm:grid-cols-3">
                    <div className="sm:col-span-2 space-y-4">
                        <div className="sm:w-1/2">
                            <h1 className="text-4xl font-bold mb-4">
                                Contact Us
                            </h1>
                            <p className="text-muted-foreground">
                                Email, call, or complete the form to learn how
                                GND Millwork can provide a wonderful service for
                                you.
                            </p>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4  sm:gap-8 lg:w-2/3">
                            <div className="  ">
                                <p className="uppercase font-bold mb-2">
                                    Office
                                </p>

                                <div className="py-0.5">
                                    13285 SW 131TH ST Miami, Fl 33186
                                </div>
                            </div>
                            <div className="  ">
                                <p className="uppercase font-bold mb-2">
                                    {list.opening.title}
                                </p>
                                {list.opening.rows.map((r) => (
                                    <div key={r} className="py-0.5">
                                        {r}
                                    </div>
                                ))}
                            </div>
                            <div className=" ">
                                <p className="uppercase font-bold mb-2">
                                    {list.call.title}
                                </p>
                                {list.call.rows.map((r) => (
                                    <a
                                        href={`tel:+${r.phone}`}
                                        key={r.phone}
                                        className="py-0.5 block hover:underline"
                                    >
                                        <span className="mr-2"> {r.type}</span>
                                        <span>{r.phone}</span>
                                    </a>
                                ))}
                            </div>
                            <div className=" ">
                                <p className="uppercase font-bold mb-2">
                                    Email
                                </p>
                                {list.email.map((r) => (
                                    <a
                                        href={`mailto:${r}`}
                                        key={r}
                                        className="py-0.5 block hover:underline"
                                    >
                                        <span>{r}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
