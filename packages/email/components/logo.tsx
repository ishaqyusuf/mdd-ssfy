import { Img, Section } from "@react-email/components";

import { getEmailUrl } from "@gnd/utils/envs";

const baseUrl = getEmailUrl();

export function Logo() {
  return (
    <Section className="mt-[32px]">
      <style>{`
      .logo-blend {
        filter: none;
      }
      
      /* Regular dark mode - exclude Outlook.com and disable-dark-mode class */
      @media (prefers-color-scheme: dark) {
        .logo-blend:not([class^="x_"]):not(.disable-dark-mode .logo-blend) {
          filter: invert(1) brightness(1);
        }
      }
      
      /* Outlook.com specific dark mode targeting - but not when dark mode is disabled */
      [data-ogsb]:not(.disable-dark-mode) .logo-blend,
      [data-ogsc]:not(.disable-dark-mode) .logo-blend,
      [data-ogac]:not(.disable-dark-mode) .logo-blend,
      [data-ogab]:not(.disable-dark-mode) .logo-blend {
        filter: invert(1) brightness(1);
      }
      
      /* Force no filter when dark mode is disabled */
      .disable-dark-mode .logo-blend {
        filter: none !important;
      }
    `}</style>
      <Img
        src={`${baseUrl}/email/logo.png`}
        width="45"
        height="45"
        alt="GndMillwork"
        className="mx-auto my-0 block"
      />
    </Section>
  );
}
