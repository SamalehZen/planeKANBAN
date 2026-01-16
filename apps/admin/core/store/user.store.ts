import { action, observable, runInAction, makeObservable } from "mobx";
// plane internal packages
import type { TUserStatus } from "@plane/constants";
import { EUserStatus } from "@plane/constants";
import { AuthService, UserService } from "@plane/services";
import type { IUser } from "@plane/types";
// root store
import type { CoreRootStore } from "@/store/root.store";
// utils
import { removeAdminToken } from "@/utils/admin-token";

export interface IUserStore {
  // observables
  isLoading: boolean;
  userStatus: TUserStatus | undefined;
  isUserLoggedIn: boolean | undefined;
  currentUser: IUser | undefined;
  // fetch actions
  hydrate: (data: any) => void;
  fetchCurrentUser: () => Promise<IUser>;
  reset: () => void;
  signOut: () => void;
}

export class UserStore implements IUserStore {
  // observables
  isLoading: boolean = true;
  userStatus: TUserStatus | undefined = undefined;
  isUserLoggedIn: boolean | undefined = undefined;
  currentUser: IUser | undefined = undefined;
  // services
  userService;
  authService;

  constructor(private store: CoreRootStore) {
    makeObservable(this, {
      // observables
      isLoading: observable.ref,
      userStatus: observable,
      isUserLoggedIn: observable.ref,
      currentUser: observable,
      // action
      fetchCurrentUser: action,
      reset: action,
      signOut: action,
    });
    this.userService = new UserService();
    this.authService = new AuthService();
  }

  hydrate = (data: any) => {
    if (data) this.currentUser = data;
  };

  /**
   * @description Fetches the current user
   * @returns Promise<IUser>
   */
  fetchCurrentUser = async () => {
    try {
      if (this.currentUser === undefined) this.isLoading = true;
      const currentUser = await this.userService.adminDetails();
      if (currentUser) {
        await this.store.instance.fetchInstanceAdmins();
        runInAction(() => {
          this.isUserLoggedIn = true;
          this.currentUser = currentUser;
          this.isLoading = false;
        });
      } else {
        runInAction(() => {
          this.isUserLoggedIn = false;
          this.currentUser = undefined;
          this.isLoading = false;
        });
      }
      return currentUser;
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      runInAction(() => {
        this.isLoading = false;
        this.isUserLoggedIn = false;
        if (status === 401 || status === 403) {
          removeAdminToken();
          this.userStatus = {
            status: EUserStatus.AUTHENTICATION_NOT_DONE,
            message: "Session expired. Please sign in again.",
          };
        } else {
          this.userStatus = {
            status: EUserStatus.ERROR,
            message: error?.message || "An error occurred",
          };
        }
      });
      throw error;
    }
  };

  reset = async () => {
    this.isUserLoggedIn = false;
    this.currentUser = undefined;
    this.isLoading = false;
    this.userStatus = undefined;
  };

  signOut = async () => {
    removeAdminToken();
    this.store.resetOnSignOut();
  };
}
