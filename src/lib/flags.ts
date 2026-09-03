/**
 * El registro público queda abierto salvo que ALLOW_SIGNUP sea exactamente
 * "false". Abierto por defecto para que el primer despliegue permita crear
 * la cuenta del dueño; cerrarlo después no afecta a las cuentas existentes.
 */
export const signupEnabled = process.env.ALLOW_SIGNUP !== "false";
