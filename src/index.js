import { Base64 } from "js-base64";

const encodings = ["Big5", "UTF-8", "Base64", "UTF-8"];

export default function parseQRCode(qrstrings, options = { detail: false }) {
  let leftQrstring, rightQrstring;
  if (Array.isArray(qrstrings)) {
    [leftQrstring, rightQrstring] = qrstrings;
  } else {
    leftQrstring = qrstrings;
  }
  if (typeof leftQrstring !== "string" || (typeof rightQrstring !== "string" && typeof rightQrstring !== "undefined"))
    throw Error("qrstrings type incorrect. It should be string or array of strings");

  const invYear = (parseInt(leftQrstring.substring(10, 13), 10) + 1911).toString();
  const invMonthDay = leftQrstring.substring(13, 17);

  let invoiceInfo = {
    invNum: leftQrstring.substring(0, 10),
    invDate: invYear + invMonthDay,
    randomNumber: leftQrstring.substring(17, 21),
    salesAmount: parseInt(leftQrstring.substring(21, 29), 16),
    totalAmount: parseInt(leftQrstring.substring(29, 37), 16),
    buyerBan: leftQrstring.substring(37, 45),
    sellerBan: leftQrstring.substring(45, 53),
    encrypt: leftQrstring.substring(53, 77)
  };

  const restEntries = leftQrstring.substring(78).split(":");

  if (restEntries[3] === "3") {
    const rawSalesAmount = restEntries[4];
    const rawTotalAmount = restEntries[5];
    invoiceInfo.salesAmount = parseInt(rawSalesAmount.substring(0, 8), 16) + "." + parseInt(rawSalesAmount.substring(8, 10), 16);
    invoiceInfo.totalAmount = parseInt(rawTotalAmount.substring(0, 8), 16) + "." + parseInt(rawTotalAmount.substring(8, 10), 16);
  }

  if (options.detail === false)
    return invoiceInfo;

  const customData = restEntries[0];
  const qrItemsAmount = parseInt(restEntries[1]);
  const itemsAmount = parseInt(restEntries[2]);
  const encoding = encodings[parseInt(restEntries[3])];

  if (typeof rightQrstring !== "string" || rightQrstring.slice(0, 2) !== "**")
    throw Error("Right qrstring is missing or incorrect.");

  rightQrstring = rightQrstring.slice(2);

  let flatDetails = [];

  switch (restEntries[3]) {
    case "0":
      throw Error("BIG5-encoding invoices are not supported.");
      break;
    case "1":
      flatDetails = flatDetails.concat(restEntries.slice(4));
      const tmpEntries1 = rightQrstring.split(":");
      flatDetails[flatDetails.length - 1] += tmpEntries1[0];
      flatDetails = flatDetails.concat(tmpEntries1.slice(1));
      break;
    case "2":
      flatDetails = Base64.decode(restEntries[4] + rightQrstring).split(":");
      break;
    case "3":
      flatDetails = flatDetails.concat(restEntries.slice(6));
      const tmpEntries2 = rightQrstring.split(":");
      flatDetails[flatDetails.length - 1] += tmpEntries2[0];
      flatDetails = flatDetails.concat(tmpEntries2.slice(1));
      break;
  }

  if (flatDetails.length < qrItemsAmount * 3)
    throw Error("Wrong format");

  let details = [];

  for (let i = 0; i < qrItemsAmount * 3; i += 3) {
    details.push({
      "description": flatDetails[i],
      "quantity": flatDetails[i + 1],
      "unitPrice": flatDetails[i + 2]
    });
  }

  const supplement = flatDetails.length > qrItemsAmount * 3 ? flatDetails.slice(qrItemsAmount * 3) : [];

  const extendedInvoiceInfo = {
    ...invoiceInfo,
    customData,
    qrItemsAmount,
    itemsAmount,
    encoding,
    details,
    ...(supplement !== [] && supplement)
  };
  return extendedInvoiceInfo;
}