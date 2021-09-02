function decode(input) {
  // Replace non-url compatible chars with base64 standard chars
  let result = input
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Pad out with standard base64 required padding characters
  const pad = result.length % 4;
  if (pad) {
    if (pad === 1) {
      throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding');
    }
    result += new Array(5 - pad).join('=');
  }

  return atob(result);
}

class JwtManager {
  decode(token) {
    try {
      return token && JSON.parse(decode(token.split('.')[1]));
    } catch (error) {
      return null;
    }
  }
}

export default new JwtManager();
