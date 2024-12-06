import { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { Octokit } from '@octokit/rest';
import { CalledWithMock, DeepMockProxy, Matcher, MatcherCreator, mockDeep } from 'vitest-mock-extended';

type PaginateArgs = Parameters<PaginateInterface>[0];
type PaginateParameters = Parameters<PaginateInterface>[1];
type CalledWith = ReturnType<CalledWithMock<any, any>>;
type Mocktokit = DeepMockProxy<Octokit> & {
  paginateCalledWith(path: string, parameters?: any): CalledWith;
}

const parameterMatcher: MatcherCreator<object> = (expectedValue) => {
  return new Matcher((actualValue) => {
    if(!expectedValue) {
      return true;
    };

    const keys = Object.keys(expectedValue);

    for (const key of keys) {
      if (actualValue[key] !== expectedValue[key]) {
        return false;
      }
    }
    return true;

  }, "test")
}


function createMocktokit(): Mocktokit {
  const octokit: DeepMockProxy<Octokit> = mockDeep<Octokit>();


  function paginateCalledWith(path: string, parameters?: object): CalledWith {
    if(parameters) {
      // Very hacked as the vites-mock-extended does not correctly infer the overloaded types of the "paginate" call (which we expect to be a function(string, parameters) but it can be much more). As such, we do this very bad type-casting for now - will be fixed later (promise ;) )
      return octokit.paginate.calledWith(path as unknown as PaginateArgs, parameterMatcher(parameters) as unknown as PaginateParameters);
    }
    return octokit.paginate.calledWith(path as unknown as PaginateArgs);
  }

  return Object.assign(octokit, { paginateCalledWith });
}

export {
  createMocktokit,
  parameterMatcher
};
