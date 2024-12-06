import { PaginateInterface } from "@octokit/plugin-paginate-rest";
import { Octokit } from '@octokit/rest';
import { CalledWithMock, DeepMockProxy, mockDeep } from 'vitest-mock-extended';

type PaginateArgs = Parameters<PaginateInterface>[0];

type CalledWith = ReturnType<CalledWithMock<any, any>>;

type Mocktokit = DeepMockProxy<Octokit> & {
  paginateCalledWith(path: string): CalledWith;
}


function createMocktokit(): Mocktokit {
  const octokit: DeepMockProxy<Octokit> = mockDeep<Octokit>();


  function paginateCalledWith(path: string): CalledWith {
    return octokit.paginate.calledWith(path as unknown as PaginateArgs);
  }

  return Object.assign(octokit, { paginateCalledWith });
}

export {
  createMocktokit
};
