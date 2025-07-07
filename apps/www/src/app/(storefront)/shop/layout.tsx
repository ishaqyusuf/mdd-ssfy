import ContactHeader from "../_components/contact-header";
import SiteFooter from "../_components/footer";
import SiteHeader from "../_components/site-header";

export default function shop({ children }) {
    return (
        <div className="min-h-screen flex flex-col">
            <div>
                <ContactHeader />
                <SiteHeader />
            </div>
            {children}
            <SiteFooter />
        </div>
    );
}
