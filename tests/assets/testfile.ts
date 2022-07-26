import { Arrays, Protobuf, System, SafeMath, authority } from "koinos-sdk-as";
import { token } from "./proto/token";

export class Token extends OtherClass {

  name: string = "Token";

  /**
   * Name function
   * @my test value with spaces
   * @param args
   */
  name(args: token.name_arguments): token.name_result {
    return new token.name_result(this.name);
  }

  /**
   * Transfer function
   * @param args
   * @returns
   */
  transfer(args: token.transfer_arguments): token.transfer_result {
    const from = args.from!;
    const to = args.to!;
    const value = args.value;

    const res = new token.transfer_result();

    if (Arrays.equal(from, to)) {
      System.log("Cannot transfer to self");

      return res;
    }

    System.requireAuthority(authority.authorization_type.contract_call, from);

    const fromBalance = this._state.GetBalance(from);

    if (fromBalance.value < value) {
      System.log("'from' has insufficient balance");

      return res;
    }

    const toBalance = this._state.GetBalance(to);

    // the balances cannot hold more than the supply, so we don't check for overflow/underflow
    fromBalance.value -= value;
    toBalance.value += value;

    this._state.SaveBalance(from, fromBalance);
    this._state.SaveBalance(to, toBalance);

    const transferEvent = new token.transfer_event(from, to, value);
    const impacted = [to, from];

    System.event(
      "token.transfer",
      Protobuf.encode(transferEvent, token.transfer_event.encode),
      impacted
    );

    res.value = true;

    return res;
  }
}
