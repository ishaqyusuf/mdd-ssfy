"use client";

import { Footer } from "@/components/footer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const termsOfUseContent = `
# Terms of Use

This Site and the materials within it are © 2020 GND Millwork Corp. Viewing or using this Site creates a copy of GND Millwork materials in your computer’s random access memory and/or in your hard drive and/or in your proxy server.

## Use License

GND Millwork Corp, Inc. (“GND Millwork” or “Millwork”) grant you permission to view and use this Site and to print individual pages from this Site for your own personal, noncommercial use, provided that you agree to and accept without modification the notices, terms and conditions set forth herein. You may not modify, copy (except as set forth in the preceding sentence), distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer or sell any information, material, software, products or services from this Site.

Your use of this Site constitutes your agreement and acceptance without modification of the notices, terms and conditions set forth herein. In addition, as a condition of your use of this Site, you represent and warrant to GND Millwork that you will not use this Site for any purpose that is unlawful, immoral or prohibited by these terms, conditions and notices. If you do not agree and accept without modification the notices, terms and conditions set forth herein, do not use this Site. Other than this agreement and agreements between you and GND Millwork relating to the sale of products or services to you through this Site, GND Millwork will not enter into any agreement with you or obligation to you through this Site and no attempt to create such an agreement or obligation will be effective.

## Trademarks

The trademarks, service marks and logos (collectively the “Trademarks”) used and displayed on this Site are registered and unregistered Trademarks of HDPA and others. Nothing on this Site should be construed as granting, by implication, estoppel or otherwise, any license or right to use any Trademark displayed on the Site, without the prior written permission of the Trademark owner. HDPA aggressively enforces its intellectual property rights to the fullest extent of the law. The name of GND Millwork, GND Millwork logo or the other GND Millwork formatives may not be used in any way, including in advertising or publicity pertaining to distribution of materials on this Site, without prior, written permission from HDPA. HDPA prohibits use of GND Millwork logo as part of a link to or from any site unless establishment of such a link is approved in advance by HDPA in writing. Fair use of HDPA’s Trademarks requires proper acknowledgment. Other product and company names mentioned in this Site may be the Trademarks of their respective owners.

## Product Orders

While we will use our best efforts to fulfill all orders, GND Millwork cannot guarantee the availability of any particular product displayed on this Site. GND Millwork reserves the right to discontinue the sale of any product listed on this Site at any time without notice.

We reserve the right to limit quantities to the amount reasonable for our regular customers.

Product prices offered on this Site may vary from other advertised prices due to varying conditions in different geographic markets.

The prices displayed on this Site are quoted in U.S. dollars and are valid and effective only within the United States, and such prices do not include shipping and handling or sales taxes, if applicable, which will be added to your total invoice price. You are responsible for the payment of any shipping and handling charges and state and local sales or use taxes that may apply to your order.

While our goal is a 100% error-free Site, we do not guarantee that any content is accurate or complete, including price information and product specifications. If we discover price errors, they will be corrected on our systems, and the corrected price will apply to your order. GND Millwork reserves the right to revoke any stated offer and to correct any errors, inaccuracies or omissions (including after an order has been submitted and accepted).

For further information about purchasing products from GND Millwork, please read our FAQ: General Information About Products and our Product Return Policy carefully.

## Links to Third Party Sites

This Site may contain links to sites owned or operated by parties other than HDPA or GND Millwork. Such links are provided for your reference only. GND Millwork does not control outside sites and is not responsible for their content. GND Millwork’s inclusion of links to an outside site does not imply any endorsement of the material on the site or, unless expressly disclosed otherwise, any sponsorship, affiliation or association with its owner, operator or sponsor, nor does GND Millwork’s inclusion of the links imply that GND Millwork is authorized to use any trade name, trademark, logo, legal or official seal or copyrighted symbol that may be reflected in the linked site.

## NO WARRANTIES; EXCLUSION OF LIABILITY

GND MILLWORK AND HDPA MAKE NO REPRESENTATION ABOUT THE SUITABILITY OF THE MATERIALS ON THIS SITE FOR ANY PURPOSE. ALL SUCH MATERIALS ARE PROVIDED “AS IS” WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. GND MILLWORK SPECIFICALLY DISCLAIM ALL WARRANTIES AND CONDITIONS OF ANY KIND, INCLUDING ALL IMPLIED WARRANTIES AND CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND -NON-INFRINGEMENT. GND MILLWORK DO NOT HAVE ANY LIABILITY OR RESPONSIBILITY FOR ANY ERRORS OR OMISSIONS IN THE CONTENT OF THIS SITE, FOR YOUR ACTION OR INACTION IN CONNECTION WITH THIS SITE OR FOR ANY DAMAGE TO YOUR COMPUTER OR DATA OR ANY OTHER DAMAGE YOU MAY INCUR IN CONNECTION WITH THIS SITE. YOUR USE OF THIS SITE IS AT YOUR OWN RISK. IN NO EVENT SHALL EITHER GND MILLWORK, ITS AFFILIATES OR AGENTS BE LIABLE FOR ANY DIRECT, INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL OR CONSEQUENTIAL DAMAGES ARISING OUT OF OR IN ANY WAY CONNECTED WITH THE USE OF THIS SITE, THE MATERIALS IN THIS SITE, THE DELAY OR INABILITY TO USE THIS SITE OR OTHERWISE ARISING IN CONNECTION WITH THIS SITE, WHETHER BASED ON CONTRACT, TORT, STRICT LIABILITY OR OTHERWISE, EVEN IF ADVISED OF THE POSSIBILITY OF ANY SUCH DAMAGES.

SOME STATES AND/OR JURISDICTIONS DO NOT ALLOW THE EXCLUSION OR LIMITATION OF DIRECT, INDIRECT, INCIDENTAL, SPECIAL AND/OR CONSEQUENTIAL DAMAGES, SO THE ABOVE EXCLUSION MAY NOT APPLY TO YOU.

## Contacting Us

If you have any questions about this agreement, please call us at (305) 278-6555, log on to https://gndmillwork.com/contact-us/, or write us at: support@gndmillwork.com

GND Millwork Corp, Inc.
Attention: Internet Customer Service
13285 SW 131TH ST
Miami, Fl 33186

Although GND Millwork will in most circumstances be able to receive your e-mail or other information provided through this Site (including, without limitation, service requests and other submissions), GND Millwork does not guarantee that it will receive all such e-mail or other information timely and accurately and shall not be legally obligated to read, act on or respond to any such e-mail or other information. Be aware that Internet e-mail typically is not secure.

## DIGITAL MILLENIUM COPYRIGHT ACT (“DMCA”)

GND Millwork respond to notices of alleged copyright infringement pursuant to the requirements of the DMCA. If You believe that any content on this site infringes your copyrights, You may request removal of such content by providing written notice to support@gndmillwork.com

This email address should only be used to report allegations of copyright infringement. Contact information for other matters is provided elsewhere on this site.

Your notice must satisfy the requirements of the DMCA and include the following information:
(i) Your name, mailing address, and email address;
(ii) A statement identifying the copyrighted material You claim is infringed, such as a URL linking to an authorized version of the copyrighted material;
(iii) A statement identifying where the allegedly infringing material is located, such as URL linking to the allegedly infringing material;
(iv) A statement that You have a good faith belief that the allegedly infringing material identified in section (ii), above, is not authorized by the copyright owner, its agent, or the law;
(v) A statement, made under penalty of perjury, that the information in this notice is accurate and that You are the owner of the copyrighted material or are authorized to act on behalf of the owner of the copyrighted material; and
(vi) An electronic or physical signature of a person authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

GND Millwork reserves the right to disregard a notice that is unclear or otherwise fails to comply with the DMCA. In the event that GND Millwork determines that a DMCA notice lacks validity, GND Millwork may refuse to remove the complained of content at its discretion. Election by GND Millwork to either remove or leave the complained of content does not constitute a legal decision about the validity of your claim of infringement or the possible defenses to a claim.

## General

You agree that this agreement and your use of this Site are governed by the laws of the State of Florida, USA. You hereby consent to the exclusive jurisdiction and venue of the courts, tribunals, agencies and other dispute resolution organizations in Miami, Florida, USA in all disputes (a) arising out of, relating to, or concerning this Site and/or this agreement, (b) in which this Site and/or this agreement is an issue or a material fact, or (c) in which this Site and/or this agreement is referenced in a paper filed in a court, tribunal, agency or other dispute resolution organization. Use of this Site is unauthorized in any jurisdiction that does not give full effect to all provisions of this agreement, including without limitation this paragraph and the warranty disclaimers and liability exclusions above. GND Millwork has endeavored to comply with all legal requirements known to it in creating and maintaining this Site, but makes no representation that materials on this Site are appropriate or available for use in any particular jurisdiction. Use of this Site is unauthorized in any jurisdiction where all or any portion of this Site may violate any legal requirements and you agree not to access this Site in any such jurisdiction. You are responsible for compliance with applicable laws. Any use in contravention of this provision or any provision of this agreement is at your own risk and, if any part of this agreement is invalid or unenforceable under applicable law, the invalid or unenforceable provision will be deemed superseded by a valid, enforceable provision that most closely matches the intent of the original provision and the remainder of the agreement shall govern such use.

WITH THE PRIOR AGREEMENT OF GND MILLWORK, ANY CLAIM, DISPUTE OR CONTROVERSY ARISING OUT OF, RELATING TO OR CONCERNING THIS SITE AND/OR THIS AGREEMENT SHALL BE DECIDED BY BINDING ARBITRATION IN ACCORDANCE WITH THE RULES OF THE AMERICAN ARBITRATION ASSOCIATION AND ANY SUCH ARBITRATION PROCEEDINGS SHALL BE BROUGHT AND HELD IN MIAMI, FLORIDA, USA. CLAIMS MAY ONLY BE BROUGHT IN YOUR INDIVIDUAL CAPACITY AND NOT AS A PURPORTED REPRESENTATIVE OF ANY CLASS. THE DECISIONS OF THE ARBITRATORS SHALL BE BINDING AND CONCLUSIVE UPON ALL PARTIES INVOLVED AND JUDGMENT UPON ANY AWARD OF THE ARBITRATORS MAY BE ENTERED BY ANY COURT HAVING COMPETENT JURISDICTION. THIS PROVISION SHALL BE SPECIFICALLY ENFORCEABLE IN ANY COURT OF COMPETENT JURISDICTION.

You agree that GND Millwork may at any time and without notice change the terms, conditions and notices under which this Site is offered; however, any change to the terms after your last usage of the Site will not be applied retroactively.

You agree that no joint venture, partnership, employment or agency relationship exists between you and GND Millwork as a result of this agreement or your use of this Site.

GND Millwork’s performance of this agreement is subject to existing laws and legal process and nothing contained in this agreement is in derogation of GND Millwork’s right to comply with law enforcement requests or requirements relating to your use of this App or information provided to or gathered by GND Millwork with respect to such use.

This agreement, the privacy and security statement, and terms of sale constitute the entire agreement between you and HDPA with respect to this site. This agreement supersedes all prior or contemporaneous communications and proposals, whether electronic, oral or written, between you and GND Millwork with respect to this Site. No modification of this agreement shall be effective unless it is authored by GND Millwork, Inc. or its affiliates, or unless it is physically signed in blue ink by a GND Millwork officer. Any alleged waiver of any breach of this agreement shall not be deemed to be a waiver of any future breach. A printed version of this agreement and/or of any notice given by GND Millwork in electronic form shall be admissible in judicial or administrative proceedings based upon or relating to this agreement or your use of this Site to the same extent and subject to the same conditions as other business documents and records originally generated and maintained by GND Millwork in printed form.

GND Millwork also may make employment information available through this Site. GND Millwork is an equal opportunity employer. GND Millwork provides equal employment opportunity to qualified persons without regard to race, color, religion, sex, national origin, age, veteran status or disability. GND Millwork’s policy relates to all phases of employment including recruitment, placement, promotion, training, demotion, transfer, layoff, recall and termination, rates of pay, employee benefits and participation in all company-sponsored employee activities.

THE INFORMATION AND MATERIALS IN THIS SITE ARE PROVIDED FOR YOUR REVIEW IN ACCORDANCE WITH THE NOTICES, TERMS AND CONDITIONS SET FORTH HEREIN. THESE MATERIALS DO NOT NECESSARILY REFLECT THE OPINIONS OF GND MILLWORK OR ANY OF ITS AFFILIATES OR AGENTS. THESE MATERIALS ARE NOT GUARANTEED OR REPRESENTED TO BE COMPLETE, CORRECT OR UP-TO-DATE. YOU MAY NOT ACT OR RELY ON ANY INFORMATION OR MATERIALS IN THIS SITE AND YOU PARTICULARLY SHOULD NOT MAKE ANY INVESTMENT DECISIONS BASED ON ANY INFORMATION OR MATERIALS IN THIS SITE. YOU MUST INDEPENDENTLY VERIFY THE ACCURACY OF ALL SUCH INFORMATION AND MATERIALS BEFORE ACTING OR RELYING THEREON OR MAKING ANY INVESTMENT DECISIONS IN CONNECTION THEREWITH. THESE MATERIALS MAY BE CHANGED FROM TIME TO TIME WITHOUT NOTICE.

Copyright © 2020 GND Millwork Corp, All Rights Reserved.
GND Millwork is a registered trademark of GND Millwork Corp.
`;

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {termsOfUseContent}
          </ReactMarkdown>
        </div>
      </main>
      <Footer />
    </div>
  );
}
