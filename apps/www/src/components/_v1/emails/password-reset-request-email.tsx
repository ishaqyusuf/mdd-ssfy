// import {
//   Body,
//   Container,
//   Head,
//   Heading,
//   Hr,
//   Html,
//   Img,
//   Link,
//   Preview,
//   Row,
//   Section,
//   Tailwind,
//   Text,
// } from "@react-email/components";

// interface NewsletterWelcomeEmailProps {
//   firstName?: string;
//   fromEmail?: string;
//   token: number;
// }

// const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

// export default function PasswordResetRequestEmail({
//   firstName = "there",
//   fromEmail,
//   token,
// }: NewsletterWelcomeEmailProps) {
//   const previewText = `Hello ${firstName},`;

//   return (
//     <Html>
//       <Head>
//         <title>GND-PRODESK</title>
//       </Head>
//       <Preview>{previewText}</Preview>
//       <Tailwind>
//         <Body className="mx-auto bg-zinc-50 font-sans">
//           <Container className="mx-auto my-[40px] max-w-2xl rounded p-4">
//             <Section className="mt-4">
//               {/* <Heading className="text-center text-2xl font-semibold text-zinc-950">
//                 Skateshop13
//               </Heading> */}
//               <Hr className="my-4" />

//               <Text className="mb-0 mt-6 text-center text-base">
//                 We received a request to change the password to your Payday
//                 account. You can reset your password by clicking the button
//                 below.
//               </Text>
//               <Text className="m-0 text-center text-base">
//                 Password Reset Code
//               </Text>
//               <Heading className="text-center text-3xl font-semibold tracking-widest uppercase text-zinc-800">
//                 {token}
//               </Heading>
//               <Text className="m-0 text-center text-base">
//                 This code expires in{" "}
//                 <Text className="font-bold">10 minutes</Text>
//               </Text>
//             </Section>
//           </Container>
//         </Body>
//       </Tailwind>
//     </Html>
//   );
// }
