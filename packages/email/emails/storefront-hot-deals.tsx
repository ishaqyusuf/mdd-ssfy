
import {
  Body,
  Button,
  Container,
  Heading,
  Preview,
  Section,
  Text,
  Img,
  Row,
  Column,
} from "@react-email/components";
import { Footer } from "components/footer";
import { Logo } from "components/logo";
import {
  EmailThemeProvider,
  getEmailInlineStyles,
  getEmailThemeClasses,
} from "components/theme";

interface Product {
  name: string;
  price: number;
  imageUrl: string;
  productUrl: string;
}

interface Props {
  name?: string;
  products?: Product[];
}

const defaultProducts: Product[] = [
  {
    name: "Product 1",
    price: 49.99,
    imageUrl: "https://via.placeholder.com/260x200",
    productUrl: "https://example.com/product/1",
  },
  {
    name: "Product 2",
    price: 79.99,
    imageUrl: "https://via.placeholder.com/260x200",
    productUrl: "https://example.com/product/2",
  },
  {
    name: "Product 3",
    price: 29.99,
    imageUrl: "https://via.placeholder.com/260x200",
    productUrl: "https://example.com/product/3",
  },
  {
    name: "Product 4",
    price: 99.99,
    imageUrl: "https://via.placeholder.com/260x200",
    productUrl: "https://example.com/product/4",
  },
];

export default function StorefrontHotDeals({
  name = "Ishaq Yusuf",
  products = defaultProducts,
}: Props) {
  const themeClasses = getEmailThemeClasses();
  const lightStyles = getEmailInlineStyles("light");

  const previewText = `Hot deals you don't want to miss!`;

  return (
    <EmailThemeProvider preview={<Preview>{previewText}</Preview>}>
      <Body
        className={`my-auto mx-auto font-sans ${themeClasses.body}`}
        style={lightStyles.body}
      >
        <Container
          className={`my-[40px] mx-auto p-[20px] max-w-[600px] ${themeClasses.container}`}
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: lightStyles.container.borderColor,
          }}
        >
          <Logo />
          <Heading
            className={`text-[21px] font-normal text-center p-0 my-[30px] mx-0 ${themeClasses.heading}`}
            style={{ color: lightStyles.text.color }}
          >
            Check out these hot deals!
          </Heading>
          <Text
            className={`font-medium ${themeClasses.text}`}
            style={{ color: lightStyles.text.color }}
          >
            Hi {name},
          </Text>
          <Text
            className={themeClasses.text}
            style={{ color: lightStyles.text.color }}
          >
            We've got some amazing deals for you. Don't miss out on these
            limited-time offers.
          </Text>

          <Section>
            <Row>
              {products.slice(0, 2).map((product) => (
                <Column key={product.name} style={{ width: "50%" }}>
                  <div style={{ padding: "10px" }}>
                    <Img
                      src={product.imageUrl}
                      alt={product.name}
                      width="100%"
                      style={{ borderRadius: "4px" }}
                    />
                    <Text style={{ margin: "10px 0" }}>{product.name}</Text>
                    <Text style={{ fontWeight: "bold" }}>${product.price}</Text>
                    <Button href={product.productUrl}>View Product</Button>
                  </div>
                </Column>
              ))}
            </Row>
            <Row>
              {products.slice(2, 4).map((product) => (
                <Column key={product.name} style={{ width: "50%" }}>
                  <div style={{ padding: "10px" }}>
                    <Img
                      src={product.imageUrl}
                      alt={product.name}
                      width="100%"
                      style={{ borderRadius: "4px" }}
                    />
                    <Text style={{ margin: "10px 0" }}>{product.name}</Text>
                    <Text style={{ fontWeight: "bold" }}>${product.price}</Text>
                    <Button href={product.productUrl}>View Product</Button>
                  </div>
                </Column>
              ))}
            </Row>
          </Section>

          <Footer />
        </Container>
      </Body>
    </EmailThemeProvider>
  );
}
