import * as ftest from '@firebase/rules-unit-testing'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import firebaseApp from 'firebase/compat'
import * as fs from 'fs'
import 'jest'
type Storage = firebaseApp.storage.Storage

let testEnv: ftest.RulesTestEnvironment
const userImageRef = (storage: Storage, userId: string, imageName: string) =>
  userImagesRef(storage, userId).child(imageName)
const userImagesRef = (storage: Storage, userId: string) =>
  storage.ref(`users/${userId}`)
const loadIconImage = () => fs.readFileSync('./icon.png')
const loadBigIconImage = () => fs.readFileSync('./big_icon.png')
const create500MBImage = () => Buffer.alloc(500 * 1024 * 1024);
const contentType = 'image/png'

jest.setTimeout(20000);

beforeAll(async () => {
  testEnv = await ftest.initializeTestEnvironment({
    projectId: 'demo-users-storage-rules-test',
    storage: {
      rules: fs.readFileSync('./storage.rules', 'utf8'),
    },
  })
})
beforeEach(async () => await testEnv.clearStorage())
afterAll(async () => await testEnv.cleanup())

describe('users', () => {
  describe('get', () => {
    describe('if a user is not authenticated', () => {
      const userId = 'user'
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
          await userImageRef(context.storage(), userId, 'icon.png').put(loadIconImage(), { contentType }).then()
        })
      })
      test('cannot get image', async () => {
        await assertFails(
          userImageRef(testEnv.unauthenticatedContext().storage(), userId, 'icon.png').getDownloadURL()
        )
      })
    })
    describe('if a user is authenticated', () => {
      const userId = 'user'
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
          await userImageRef(context.storage(), userId, 'icon.png').put(loadIconImage())
        })
      })
      describe('try to get user own image', () => {
        test('can get image', async () => {
          await assertSucceeds(
            userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'icon.png').getDownloadURL()
          )
        })
      })
      describe("another user tries to get user's image", () => {
        test('cannot get image', async () => {
          const userId = 'user'
          const anotherUserId = 'user2'
          await assertFails(
            userImageRef(testEnv.authenticatedContext(anotherUserId).storage(), userId, 'icon.png').getDownloadURL()
          )
        })
      })
    })
  })

  describe('list', () => {
    describe('if a user is not authenticated', () => {
      const userId = 'user'
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
          const storage = context.storage()
          await userImageRef(storage, userId, 'icon1.png').put(loadIconImage(), { contentType })
          await userImageRef(storage, userId, 'icon2.png').put(loadIconImage(), { contentType })
        })
      })
      test('cannot get images', async () => {
        await assertFails(userImagesRef(testEnv.authenticatedContext(userId).storage(), userId).listAll())
      })
    })
  })

  describe('create', () => {
    describe('if a user is not authenticated', () => {
      test('cannot put am image', async () => {
        await assertFails(
          userImageRef(
            testEnv.unauthenticatedContext().storage(), 'user', 'icon.png')
            .put(loadIconImage(), { contentType })
            .then()
        )
      })
    })

    describe('if a user is authenticated', () => {
      const userId = 'user'
      describe('try to put image to user own directory', () => {
        test('can put am image', async () => {
          await assertSucceeds(
            userImageRef(
              testEnv.authenticatedContext(userId).storage(), userId, 'icon.png')
                .put(loadIconImage(), { contentType })
                .then()
          )
        })
      })
      describe("another user tries to put image to user's directory", () => {
        test('cannot put am image', async () => {
          const anotherUserId = 'user2'
          await assertFails(
            userImageRef(
              testEnv.authenticatedContext(anotherUserId).storage(), userId, 'icon.png')
                .put(loadIconImage(), { contentType })
                .then()
          )
        })
      })
      describe('try to put image with 100KB to user own directory', () => {
        test('cannot put am image', async () => {
          await assertFails(
            userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'big_icon.png')
              .put(loadBigIconImage(), { contentType })
              .then()
          )
        })
      })
      describe('try to put image with 500MB to user own directory', () => {
        test('cannot put am image', async () => {
          await assertFails(
            userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'big_icon.png')
              .put(create500MBImage(), { contentType })
              .then()
          )
        })
      })
      describe('try to put image with invalid contentType to user own directory', () => {
        test('cannot put am image', async () => {
          await assertFails(
            userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'icon.png')
              .put(loadIconImage(), { contentType: 'image/jpeg' })
              .then()
          )
        })
      })

      describe('try to put image with invalid file extension to user own directory', () => {
        test('cannot put am image', async () => {
          await assertFails(
            userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'icon.jpg')
              .put(loadIconImage(), { contentType })
              .then()
          )
        })
      })
    })
  })

  describe('update', () => {
    describe('if a user is not authenticated', () => {
      const userId = 'user'
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
          const storage = context.storage()
          await userImageRef(storage, userId, 'icon.png').put(loadIconImage(), { contentType })
        })
      })
      test('cannot update metadata of an image', async () => {
        await assertFails(userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'icon.png').updateMetadata({}))
      })
    })
  })

  describe('delete', () => {
    describe('if a user is not authenticated', () => {
      const userId = 'user'
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async context => {
          const storage = context.storage()
          await userImageRef(storage, userId, 'icon.png').put(loadIconImage(), { contentType })
        })
      })
      test('cannot delete an image', async () => {
        await assertFails(userImageRef(testEnv.authenticatedContext(userId).storage(), userId, 'icon.png').delete())
      })
    })
  })
})
