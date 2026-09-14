import {
  InternalServerError,
  MethodNotAllowedError,
  ServiceError,
} from "infra/errors";

function onNoMatchHandler(request, response) {
  const publicError = new MethodNotAllowedError();
  response.status(publicError.statusCode).json(publicError);
}

function onErrorHandler(error, request, response) {
  if (error instanceof ServiceError) {
    console.error(error);
    return response.status(error.statusCode).json(error);
  }

  const publicError = new InternalServerError({ cause: error });
  console.error(publicError);
  response.status(publicError.statusCode).json(publicError);
}

const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
};

export default controller;
