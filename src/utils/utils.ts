
export const cleanPhoneNumber = (number: string) : string => {
  return number.startsWith('521') ? number.replace("521", "52") : number;
};