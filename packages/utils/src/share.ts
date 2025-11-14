interface Props {
  url: string;
  recipient: string;
  msg: string;
}
export async function share(props: Props) {
  try {
    const blob = await fetch(props.url).then((r) => r.blob());
    const file = new File([blob], "invoice.pdf", {
      type: "application/pdf",
    });
    console.log("FILE>>>");
    if (navigator.share) {
      await navigator.share({
        title: "Invoice",
        text: "Here’s your invoice PDF",
        files: [file],
      });
    } else {
      //   alert("Sharing not supported on this device.");
      const msg = `Here's your invoice: ${props.url}`;
      const whatsappUrl = `https://wa.me?text=${encodeURIComponent(msg)}`;
      const link = document.createElement("a");
      link.target = "_blank";
      link.href = whatsappUrl;
      link.click();
    }
    return;
  } catch (error) {}
  //   const msg = `Here's your invoice: ${props.url}`;
  //   const whatsappUrl = `https://wa.me?text=${encodeURIComponent(msg)}`;
  //   const link = document.createElement("a");
  //   link.target = "_blank";
  //   link.href = whatsappUrl;
  //   link.click();
}
