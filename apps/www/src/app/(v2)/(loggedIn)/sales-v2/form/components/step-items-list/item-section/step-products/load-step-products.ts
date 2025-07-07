// import { DykeStep } from "@/app/(v2)/(loggedIn)/sales-v2/type";

// export async function stepProducts(stepForm: DykeStep, onLoad, setStep?) {
//     const stepFormTitle = stepForm.step.title;
//     if (stepFormTitle == "Door") {
//         setStep("Door");
//         const query = doorQueryBuilder(
//             item.get.getFormStepArray(),
//             item.get.doorType()
//         );
//         // console.log("QUERY>", query);
//         const _props = { ...query, stepId: stepForm?.step?.id };
//         // console.log(_props);
//         const { result: prods } = await getDykeStepDoors(_props as any);
//         setStepProducts(prods);
//     } else if (doorType == "Moulding" && stepFormTitle == "Moulding") {
//         setStep?.("Moulding");
//         const specie = item.get.getMouldingSpecie();
//         const prods = await getMouldingStepProduct(specie);
//         // console.log(prods);

//         setStepProducts(prods);
//     } else if (doorType == "Door Slabs Only" && stepFormTitle == "Door Type") {
//         setStep?.("Slab");
//         setStepProducts(await getSlabDoorTypes());
//         // if(stepFormTitle == 'Height' )
//     } else {
//         const _stepProds = await getStepProduct(stepForm?.step?.id);
//         // console.log(_stepProds);
//         setStepProducts(_stepProds);
//     }

// }
