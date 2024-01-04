# Movie Database Backend Server

This repository hosts a simple backend server designed to manage a movie database. It utilizes Swagger UI to generate interactive API documentation, allowing users to explore and test API calls directly within their browsers.

## Setting Up the Movie Database

To get started, import the provided SQL dump file into your SQL Workbench and execute it as a regular script.

## User Profile Routes

### GET /user/{email}/profile

This route retrieves a user's profile information in JSON format. The response varies based on the authorization status.

- **Authorized Request (with valid JWT bearer token):**
  ```json
  200 OK
  {
    "email": "mike@gmail.com",
    "firstName": "Michael",
    "lastName": "Jordan",
    "dob": "1963-02-17",
    "address": "123 Fake Street, Springfield"
  }
  ```
- **Unauthorized Request (without 'Authorized:' header):**
```json

200 OK
{
  "email": "mike@gmail.com",
  "firstName": "Michael",
  "lastName": "Jordan"
}
```
For unauthorized requests, the server may return different responses (401 Unauthorized) based on JWT token issues.

- **JWT Token Expired:**
```
json
401 Unauthorized
{
  "error": true,
  "message": "JWT token has expired"
}
```
- **Invalid JWT Token:**
```
json

401 Unauthorized
{
  "error": true,
  "message": "Invalid JWT token"
}
```
- **Malformed Authorization Header:**
```
json

401 Unauthorized
{
  "error": true,
  "message": "Authorization header is malformed"
}
```
- **Non-existent User:**
```
json
404 Not Found
{
  "error": true,
  "message": "User not found"
}
```
*Note: A newly created user will have null values for fields that haven't been provided.*

### PUT /user/{email}/profile**

This route is used to update a user's profile information. Only the user associated with the provided email can modify their own profile.

- **Request Body (application/json)**
```
json

{
  "firstName": "Michael",
  "lastName": "Jordan",
  "dob": "1963-02-17",
  "address": "123 Fake Street, Springfield"
}
```
- **Successful Update Response**
- 
If the profile update is successful, the server responds with the updated profile:
```
json
200 OK
{
  "email": "mike@gmail.com",
  "firstName": "Michael",
  "lastName": "Jordan",
  "dob": "1963-02-17",
  "address": "123 Fake Street, Springfield"
}
```
- **Error Responses**
- 
The server may return different responses based on various scenarios:

- **Forbidden (Wrong Email):**
```
json
Copy code
403 Forbidden
{
  "error": true,
  "message": "Forbidden"
}
```
- **No Authorization Header:**

json
```
401 Unauthorized
{
  "error": true,
  "message": "Authorization header ('Bearer token') not found"
}
```

JWT Token Issues (Expired, Invalid, Malformed):

json
```
401 Unauthorized
{
  "error": true,
  "message": "JWT token has expired"
}
```
Non-existent User:

json
```
404 Not Found
{
  "error": true,
  "message": "User not found"
}
```
Incomplete Request Body:

json
```
400 Bad Request
{
  "error": true,
  "message": "Request body incomplete: firstName, lastName, dob and address are required"
}
```
Invalid Request Body (Non-string Fields):

json
```
400 Bad Request
{
  "error": true,
  "message": "Request body invalid: firstName, lastName, dob and address must be strings only"
}
```
Invalid Date of Birth:

json
```
400 Bad Request
{
  "error": true,
  "message": "Invalid input: dob must be a real date in format YYYY-MM-DD"
}
```
