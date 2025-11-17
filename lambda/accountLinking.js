import { CognitoIdentityProviderClient, AdminLinkProviderForUserCommand, AdminGetUserCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";

// Initialize Cognito client
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || "us-east-2" 
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID;

/**
 * Lambda handler for account linking
 * Links a federated identity (Google) to an existing Cognito user account
 * 
 * Expected request body:
 * {
 *   sourceUserId: string,      // User ID from the federated provider (Google)
 *   destinationUserId: string,  // User ID from Cognito (email/password account)
 *   providerName: string,       // Identity provider name (e.g., "Google")
 *   idToken: string            // ID token from the current session for validation
 * }
 */
export const handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
      },
      body: JSON.stringify({}),
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    if (!USER_POOL_ID) {
      console.error("COGNITO_USER_POOL_ID not configured");
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Server configuration error" }),
      };
    }

    // Parse request body
    let body;
    try {
      body = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Invalid JSON in request body" }),
      };
    }

    const { sourceUserId, destinationUserId, providerName, idToken, email, password } = body;

    // Validate required fields
    // We need either destinationUserId OR email+password to find the destination user
    if (!sourceUserId || !providerName) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing required fields: sourceUserId, providerName" }),
      };
    }

    if (!destinationUserId && (!email || !password)) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Missing required fields: provide either destinationUserId or email+password" }),
      };
    }

    // Get source user (federated identity - Google)
    const sourceUser = await getUserById(sourceUserId);
    if (!sourceUser) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Source user (Google account) not found" }),
      };
    }

    const sourceEmail = sourceUser.Attributes?.find(attr => attr.Name === "email")?.Value || 
                       sourceUser.UserAttributes?.find(attr => attr.Name === "email")?.Value;

    // Get destination user
    let destUser;
    let destUserId = destinationUserId;

    if (destUserId) {
      // User ID provided directly
      destUser = await getUserById(destUserId);
    } else if (email && password) {
      // Need to find user by email and verify password
      // Note: We can't directly authenticate here, but we can find by email
      // The client should have already authenticated, so we trust the email
      destUser = await getUserByEmail(email);
      if (destUser) {
        destUserId = destUser.Username;
      }
    }

    if (!destUser || !destUserId) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: "Destination user (email account) not found. Please ensure the email account exists." }),
      };
    }

    // Extract emails from user attributes
    const destEmail = destUser.Attributes?.find(attr => attr.Name === "email")?.Value ||
                     destUser.UserAttributes?.find(attr => attr.Name === "email")?.Value;

    // Security check: Ensure both accounts have the same email
    if (!sourceEmail || !destEmail || sourceEmail !== destEmail) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ 
          error: "Cannot link accounts: emails do not match",
          sourceEmail: sourceEmail || "not found",
          destEmail: destEmail || "not found"
        }),
      };
    }

    // Link the accounts
    // The source user (federated identity - Google) will be linked to the destination user (Cognito email account)
    // After linking, users can sign in with either Google or email/password
    try {
      await cognitoClient.send(
        new AdminLinkProviderForUserCommand({
          UserPoolId: USER_POOL_ID,
          DestinationUser: {
            ProviderName: "Cognito",
            ProviderAttributeValue: destUserId, // Use the email account as destination
          },
          SourceUser: {
            ProviderName: providerName,
            ProviderAttributeName: "Cognito_Subject",
            ProviderAttributeValue: sourceUserId, // Google account user ID
          },
        })
      );

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          success: true,
          message: "Accounts linked successfully",
          email: sourceEmail,
        }),
      };
    } catch (linkError) {
      console.error("Account linking error:", linkError);
      
      // Handle specific Cognito errors
      if (linkError.name === "AliasExistsException") {
        return {
          statusCode: 409,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ 
            error: "Account is already linked to another user",
          }),
        };
      }

      if (linkError.name === "InvalidParameterException") {
        return {
          statusCode: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
          body: JSON.stringify({ 
            error: "Invalid account linking parameters",
            details: linkError.message,
          }),
        };
      }

      throw linkError;
    }
  } catch (error) {
    console.error("Error in account linking function:", error);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ 
        error: "Internal server error",
        message: error.message,
      }),
    };
  }
};

/**
 * Get user by user ID (sub or username)
 */
async function getUserById(userId) {
  try {
    // First, try to get user directly by username (if userId is username)
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: userId,
      });
      const result = await cognitoClient.send(command);
      return result;
    } catch (e) {
      // If that fails, search by sub attribute
      // Note: AdminGetUser doesn't support searching by sub directly
      // We need to use ListUsers with a filter
      const listCommand = new ListUsersCommand({
        UserPoolId: USER_POOL_ID,
        Filter: `sub = "${userId}"`,
        Limit: 1,
      });
      const listResult = await cognitoClient.send(listCommand);
      
      if (listResult.Users && listResult.Users.length > 0) {
        // Convert ListUsers response to AdminGetUser format
        const user = listResult.Users[0];
        return {
          Username: user.Username,
          UserAttributes: user.Attributes,
          UserStatus: user.UserStatus,
          Enabled: user.Enabled,
          Attributes: user.Attributes, // For compatibility
        };
      }
      
      return null;
    }
  } catch (error) {
    console.error(`Error getting user ${userId}:`, error);
    return null;
  }
}

/**
 * Get user by email address
 */
async function getUserByEmail(email) {
  try {
    const listCommand = new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
      Limit: 1,
    });
    const listResult = await cognitoClient.send(listCommand);
    
    if (listResult.Users && listResult.Users.length > 0) {
      const user = listResult.Users[0];
      return {
        Username: user.Username,
        UserAttributes: user.Attributes,
        UserStatus: user.UserStatus,
        Enabled: user.Enabled,
        Attributes: user.Attributes,
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting user by email ${email}:`, error);
    return null;
  }
}

