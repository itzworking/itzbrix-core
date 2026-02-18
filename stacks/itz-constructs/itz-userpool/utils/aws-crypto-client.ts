/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  buildClient,
  CommitmentPolicy,
  KmsKeyringNode,
} from "@aws-crypto/client-node";
import { _decrypt } from "@aws-crypto/decrypt-node/build/main/src/decrypt";

type CurryFirst<fn extends (...a: any[]) => any> = fn extends (
  _: any,
  ...tail: infer TAIL
) => any
  ? TAIL
  : never;

class AwsCryptoClientClass {
  private _generatorKeyId?: string;
  private _keyIds?: string[];
  private _keyring?: KmsKeyringNode;
  private _decrypt?: (
    ...args: CurryFirst<typeof _decrypt>
  ) => ReturnType<typeof _decrypt>;

  private setup() {
    if (this._decrypt) {
      return;
    }
    const errors = [];

    if (!process.env.COGNITO_KMS_KEY_ALIAS) {
      errors.push("Missing COGNITO_KMS_KEY_ALIAS environment variable");
    }
    this._generatorKeyId = process.env.COGNITO_KMS_KEY_ALIAS;

    if (!process.env.COGNITO_KMS_KEY_ARN) {
      errors.push("Missing COGNITO_KMS_KEY_ARN environment variable");
    }
    this._keyIds = [process.env.COGNITO_KMS_KEY_ARN || ""];

    this._decrypt = buildClient(
      CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT,
    ).decrypt;

    this._keyring = new KmsKeyringNode({
      generatorKeyId: this._generatorKeyId,
      keyIds: this._keyIds,
    });

    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }
  }

  async decrypt(encryptedData: string): Promise<string> {
    this.setup();
    if (!this._decrypt || !this._keyring) {
      // This should never happen because setup() initializes them
      throw new Error("AwsCryptoClient is not properly initialized");
    }
    const { plaintext } = await this._decrypt(
      this._keyring,
      Buffer.from(encryptedData, "base64"),
    );

    return plaintext.toString();
  }
}

export const AwsCryptoClient = new AwsCryptoClientClass();
