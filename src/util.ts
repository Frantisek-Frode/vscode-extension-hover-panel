export class Deferrer {
	latestCall = 0;

	constructor (
		private _delay : number
	) { }

	public async ShouldProceed() {
		this.latestCall++;
		const thisCall = this.latestCall;
		await new Promise(res => setTimeout(res, this._delay));
		return thisCall == this.latestCall;
	}
}