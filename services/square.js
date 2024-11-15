import crypto from 'crypto';

const getOrCreateSquareAccount = async (reqBody, squareClient) => {
  const existingSquareAccount = await getSquareAccount(reqBody.email, squareClient);
  return existingSquareAccount || await createSquareAccount(reqBody, squareClient);
};

const getSquareAccount = async (email, squareClient) => {
  try {
    const searchResponse = await squareClient.customersApi.searchCustomers({
      query: {
        filter: {
          emailAddress: {
            exact: email
          }
        }
      }
    });

    return searchResponse.result?.customers[0];
  } catch(error) {
    console.log(error);
    // TODO: handle error
  }
}

const createSquareAccount = async (reqBody, squareClient) => {
  const {
    details,
    companyName,
    firstNameOnCard,
    lastNameOnCard,
    email,
  } = reqBody;
  try {
    const createResponse = await squareClient.customersApi.createCustomer({
      idempotencyKey: crypto.randomBytes(16).toString('hex'),
      givenName: firstNameOnCard,
      familyName: lastNameOnCard,
      companyName: companyName,
      emailAddress: email,
      address: {
        postalCode: details.billing.postalCode
      },
    });

    return createResponse.result.customer;
  } catch(error) {
    console.log(error);
    // TODO: handle error
  }
};

export { getOrCreateSquareAccount };