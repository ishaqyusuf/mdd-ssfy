import { MapPin, Phone, Timer } from "lucide-react";
import AcccountHeader from "./account-header";

export default function ContactHeader() {
    return (
        <div className="min-h-10 flex p-4 justify-between bg-black/80 text-white">
            <div className="text-sm sm:flex sm:space-x-4">
                <div className="flex items-center space-x-2">
                    <MapPin className="size-4" />
                    <p>13285 SW 131th St Miami, FL 33186</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Timer className="size-4" />
                    <p>Mon – Fri 7:30 am-4:30 pm Sat & Sun CLOSED</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Phone className="size-4" />
                    <p>(305) 278-6555</p>
                </div>
            </div>
            <AcccountHeader />
        </div>
    );
}
