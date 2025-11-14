interface Props {
  url: string;
  recipient: string;
}
export async function shareSales(props: Props) {
  try {
    const blob = await fetch(props.url).then((r) => r.blob());
    const file = new File([blob], "invoice.pdf", {
      type: "application/pdf",
    });
    console.log("FILE>>>");
    return;
  } catch (error) {}
  const msg = `Here's your invoice: ${props.url}`;
  const whatsappUrl = `https://wa.me?text=${encodeURIComponent(msg)}`;
  const link = document.createElement("a");
  link.target = "_blank";
  link.href = whatsappUrl;
  link.click();
}
