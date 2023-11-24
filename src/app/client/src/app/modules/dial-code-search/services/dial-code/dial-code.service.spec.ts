import { ConfigService } from '@sunbird/shared';
import { SearchService, PlayerService, UserService, PublicDataService } from '@sunbird/core';
import * as _ from 'lodash-es';
import { of, Observable, iif, forkJoin } from 'rxjs';
import TreeModel from 'tree-model';
import { CslFrameworkService } from '../../../../modules/public/services/csl-framework/csl-framework.service';
import { DialCodeService } from './dial-code.service';

describe('DialCodeService', () => {
  let dialCodeService: DialCodeService;

  const mockData = {
    exampleProperty: 'exampleValue',
  };

  const searchServiceMock: Partial<SearchService> = {
    orgSearch: jest.fn(() => of(
      {
        result: {
          response: { content: [{ id: 'sunbird' }, { id: 'rj' }] }
        }
      }
    )) as any,
  };

  const configServiceMock: Partial<ConfigService> = {
    appConfig: {
      frameworkCatConfig: {
        changeChannel: true,
        defaultFW: 'someDefaultFramework'
      }
    }
  };

  const playerServiceMock: Partial<PlayerService> = {
    getCollectionHierarchy: jest.fn().mockReturnValue(of(mockData)),
  };

  const userServiceMock: Partial<UserService> = {
    userData$: of({
      userProfile: {
        userId: 'sample-uid',
        rootOrgId: 'sample-root-id',
        rootOrg: {},
        hashTagIds: ['id'],
        profileUserType: {
          type: 'student'
        }
      } as any
    }) as any
  };

  const publicDataServiceMock: Partial<PublicDataService> = {
    post: jest.fn().mockReturnValue(of(mockData)),
  };

  const cslFrameworkServiceMock: Partial<CslFrameworkService> = {
     getFrameworkCategories: jest.fn().mockReturnValue(of({
      result: {
        framework: {
          categories: [
            { code: 'board', terms: [{ name: 'CBSE' }] }]
        }
      }
    }) as any),
  };

  beforeEach(() => {
    dialCodeService = new DialCodeService(
      searchServiceMock as SearchService,
      configServiceMock as ConfigService,
      playerServiceMock as PlayerService,
      configServiceMock as ConfigService,
      userServiceMock as UserService,
      publicDataServiceMock as PublicDataService,
      cslFrameworkServiceMock as CslFrameworkService,
    );
  });

  it('should be created', () => {
    expect(DialCodeService).toBeTruthy();
  });

  it('should create DialCodeService instance with correct frameworkCategories', () => {
    expect(dialCodeService).toBeTruthy();
    expect(cslFrameworkServiceMock.getFrameworkCategories).toHaveBeenCalled();
    dialCodeService['frameworkCategories'].subscribe((frameworkCategories) => {
      expect(frameworkCategories).toEqual({
        result: {
          framework: {
            categories: [
              { code: 'board', terms: [{ name: 'CBSE' }] }]
          }
        }
      });
    });
  });

  it('should have the dialCodeResult property', () => {
    dialCodeService['dialSearchResults'] = 'testValue';
    expect(dialCodeService.dialCodeResult).toEqual('testValue');
  });

  it('should return empty response if dialSearchResults are not provided', async () => {
    const result = await dialCodeService.filterDialSearchResults(null).toPromise();
    expect(result).toEqual({
      collection: [],
      contents: [],
    });
    expect(playerServiceMock.getCollectionHierarchy).not.toHaveBeenCalled();
    expect(publicDataServiceMock.post).not.toHaveBeenCalled();
  });

  it('should set dialSearchResults and return response with collections and contents', async () => {
    const dialSearchResults = {
      contents: [
        { mimeType: 'application/vnd.ekstep.content-collection', contentType: 'Resource' },
        { mimeType: 'application/vnd.ekstep.content', contentType: 'Course' },
      ],
      collections: [],
    };
    const result = await dialCodeService.filterDialSearchResults(dialSearchResults).toPromise();
    expect(dialCodeService['dialSearchResults']).toEqual(dialSearchResults);
    expect(result).toEqual({
      collection: expect.any(Array),
      contents: expect.any(Array),
    });
  });

  it('should return empty response if dialSearchResults are not provided', async () => {
    const result = await dialCodeService.filterDialSearchResults(null).toPromise();
    expect(result).toEqual({
      collection: [],
      contents: [],
    });
    expect(playerServiceMock.getCollectionHierarchy).not.toHaveBeenCalled();
    expect(publicDataServiceMock.post).not.toHaveBeenCalled();
  });

  it('should parse a collection with trackable elements', () => {
    const collection = {
      identifier: 'collection1',
      trackable: { enabled: 'Yes' },
    };
    const result = dialCodeService.parseCollection(collection);
    expect(result).toHaveLength(1);
    expect(result[0].l1Parent).toBe('collection1');
  });

  it('should handle a collection without trackable elements', () => {
    const collection = {
      identifier: 'collection2',
    };
    const result = dialCodeService.parseCollection(collection);
    expect(result).toHaveLength(0);
  });

  it('should parse a collection with a mixture of trackable and non-trackable elements', () => {
    const collection = {
      identifier: 'collection3',
      trackable: { enabled: 'Yes' },
    };
    const result = dialCodeService.parseCollection(collection);
    expect(result).toHaveLength(1);
    expect(result[0].l1Parent).toBe('collection3');
  });

  it('should get collection hierarchy and return content', () => {
    const collectionId = 'mockCollectionId';
    const mockOption = {
        courseId: 'sample-courseId',
        batchId: 'sample-batch-id',
    };

    const mockResponse = {
      result: {
        content: {
          'ownershipType': ['createdBy'],
          'previewUrl': 'https://www.youtube.com/watch?v=kPJwSgHDSgY',
        }
      },
    };
    (playerServiceMock.getCollectionHierarchy as jest.Mock).mockReturnValue(of(mockResponse));
    dialCodeService.getCollectionHierarchy(collectionId, mockOption).subscribe((result) => {
      expect(result).toEqual(mockResponse.result.content);
    });
    expect(playerServiceMock.getCollectionHierarchy).toHaveBeenCalledWith(collectionId, mockOption);
  });

});
