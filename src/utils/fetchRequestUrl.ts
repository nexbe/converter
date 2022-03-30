import fetch from "node-fetch";

// ### Helper function to create URL string
export function getRequestURL(path = "") {
  return `${process.env.API_URL || "http://localhost:1337/"}${path}`;
}

// ### Helper function to make GET requests
export async function fetchRequestUrl(
  path: string,
  method: string,
  options = {}
) {
  // ### Merge default and user options
  const mergedOptions = {
    method: method,
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  // ### Build request URL
  const requestUrl = `${getRequestURL(`${path}`)}`;

  // ### Trigger API call
  const response = await fetch(requestUrl, mergedOptions);

  return await response.json();
  // // Handle response
  // if (!response.ok) {
  //   console.error("response status", response.statusText);
  //   throw new Error(`An error occurred please try again`);
  // }
  // const data = await response.json();
  // return data;
}
