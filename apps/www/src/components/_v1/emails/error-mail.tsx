// import {
//     Body,
//     Container,
//     Head,
//     Hr,
//     Html,
//     Section,
//     Tailwind,
//     Text
// } from "@react-email/components";

// interface NewsletterWelcomeEmailProps {
//     body?: string;
// }

// const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

// export default function ErrorMail({ body }: NewsletterWelcomeEmailProps) {
//     // const previewText = `Hello ${firstName},`;

//     return (
//         <Html>
//             <Head>
//                 <title>GND-PRODESK</title>
//             </Head>
//             {/* <Preview>{previewText}</Preview> */}
//             <Tailwind>
//                 <Body className="mx-auto bg-zinc-50 font-sans">
//                     <Container className="mx-auto my-[40px] max-w-2xl rounded p-4">
//                         <Section className="mt-4">
//                             {/* <Heading className="text-center text-2xl font-semibold text-zinc-950">
//                 Skateshop13
//               </Heading> */}
//                             <Hr className="my-4" />

//                             <Text className="mb-0 mt-6 text-center text-base"></Text>

//                             <Text className="m-0 text-base">{body}</Text>
//                         </Section>
//                     </Container>
//                 </Body>
//             </Tailwind>
//         </Html>
//     );
// }
