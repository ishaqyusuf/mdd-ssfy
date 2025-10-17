export function formatPaymentParams(params) {
    const { emailToken, orderIds } = params;
    return {
        emailToken,
        orderIdsParam: orderIds,

        paymentId: params.paymentId,
    };
}
