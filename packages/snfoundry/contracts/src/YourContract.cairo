#[starknet::interface]
trait ICounter<T> {
    fn get_counter(self: @T) -> u32;
    fn increase_counter(ref self: T);
    fn decrease_counter(ref self: T);
    fn reset_counter(ref self: T);
    fn set_counter(ref self: T, new_value: u32);
}

#[starknet::contract]
mod CounterContract {
    use super::ICounter;
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use starknet::{ContractAddress, get_caller_address, get_contract_address};
    use openzeppelin_access::ownable::OwnableComponent;
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    const PAYMENT_AMOUNT: u256 = 1000000000000000000; // 1 * 10 ** 18 WEI

    #[abi(embed_v0)]
    impl OwnableImpl = OwnableComponent::OwnableImpl<ContractState>;
    impl InternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        counter: u32,
        payment_token: ContractAddress,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CounterChange: CounterChanged,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
    }

    #[derive(Drop, starknet::Event)]
    struct CounterChanged {
        #[key]
        caller: ContractAddress,
        old_value: u32,
        new_value: u32,
        reason: ChangeReason,
    }
    
    #[derive(Drop, Copy, Serde)]
    enum ChangeReason {
        Increased,
        Decreased,
        Reset,
        Set,
    }

    #[constructor]
    fn constructor(ref self: ContractState, init_value: u32, owner: ContractAddress, payment_token: ContractAddress) {
        self.counter.write(init_value);
        self.ownable.initializer(owner);
        self.payment_token.write(payment_token);
        
        self.emit(CounterChanged {
            caller: get_caller_address(),
            old_value: 0,
            new_value: init_value,
            reason: ChangeReason::Set,
        });
    }   
     
    #[abi(embed_v0)]
    impl CounterImpl of ICounter<ContractState> {
        fn get_counter(self: @ContractState) -> u32 {
            self.counter.read()
        }

        fn increase_counter(ref self: ContractState) {
            let current_value = self.counter.read();
            self.counter.write(current_value + 1);

            self.emit(CounterChanged {
                caller: get_caller_address(),
                old_value: current_value,
                new_value: current_value + 1,
                reason: ChangeReason::Increased,
            });
        }

        fn decrease_counter(ref self: ContractState) {
            let current_value = self.counter.read();
            assert!(current_value > 0, "Counter must be greater than 0");
            self.counter.write(current_value - 1);

            self.emit(CounterChanged {
                caller: get_caller_address(),
                old_value: current_value,
                new_value: current_value - 1,
                reason: ChangeReason::Decreased,
            });
        }

        fn reset_counter(ref self: ContractState) {

            let old_value = self.counter.read();

            let token = IERC20Dispatcher {
                contract_address: self.payment_token.read(),
            };

            // automatically revert if the transfer fails
            token.transfer_from(get_caller_address(), get_contract_address(), PAYMENT_AMOUNT);

            self.counter.write(0);

            self.emit(CounterChanged {
                caller: get_caller_address(),
                old_value: old_value,
                new_value: 0,
                reason: ChangeReason::Reset,
            });

            token.transfer(self.ownable.owner(), PAYMENT_AMOUNT);
        }
        
        fn set_counter(ref self: ContractState, new_value: u32) {
            
            self.ownable.assert_only_owner();

            let old_value = self.counter.read();

            self.counter.write(new_value);

            self.emit(CounterChanged {
                caller: get_caller_address(),
                old_value: old_value,
                new_value: new_value,
                reason: ChangeReason::Set,
            });
        }
    }
}