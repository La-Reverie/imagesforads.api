import crypto from 'crypto';

const getOrCreateSquareCustomer = async (reqBody, squareClient) => {
  const existingSquareCustomer = await getSquareCustomer(reqBody.email, squareClient);
  return existingSquareCustomer || await createSquareCustomer(reqBody, squareClient);
};

const getSquareCustomer = async (email, squareClient) => {
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
    // console.log('CUSTOMERS::::: ', searchResponse.result);
    return searchResponse.result?.customers[0];
  } catch(error) {
    console.log(error);
    // TODO: handle error
  }
}

const createSquareCustomer = async (reqBody, squareClient) => {
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

export { getOrCreateSquareCustomer };