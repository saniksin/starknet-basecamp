use snforge_std::EventSpyAssertionsTrait;
use starknet::ContractAddress;
use snforge_std::{
    declare, ContractClassTrait, DeclareResultTrait, 
    spy_events, start_cheat_caller_address, stop_cheat_caller_address, 
    set_balance, Token, store, map_entry_address};
use contracts::counter::{ICounterDispatcher, ICounterDispatcherTrait};
use contracts::counter::CounterContract::{CounterChanged, ChangeReason, Event};
use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
use contracts::utils::{strk_to_fri, strk_address};

fn user_owner() -> ContractAddress {
    'owner'.try_into().unwrap()
}


fn deploy_counter(initial_counter: u32)-> (ContractAddress, ICounterDispatcher) {
    let contract = declare("CounterContract").unwrap().contract_class();

    let owner: ContractAddress = user_owner();
    let payment_token: ContractAddress = strk_address();

    let mut constructor_argument = array![];
    initial_counter.serialize(ref constructor_argument);
    owner.serialize(ref constructor_argument);
    payment_token.serialize(ref constructor_argument);

    let (contract_address, _) = contract.deploy(@constructor_argument).unwrap();

    (contract_address, ICounterDispatcher { contract_address })
}

#[test]
fn test_contract_initialization() {
    let (_, dispatcher) = deploy_counter(5);

    let current_counter = dispatcher.get_counter();
    let expected_counter = 5;
    assert!(current_counter == expected_counter, "Counter initialization failed");
}

#[test]
fn test_increment_counter() {
    let init_counter: u32 = 0;
    let (contract_address, dispatcher) = deploy_counter(init_counter);
    let mut spy = spy_events();

    start_cheat_caller_address(contract_address, user_owner());
    dispatcher.increase_counter();
    stop_cheat_caller_address(contract_address);

    let current_counter = dispatcher.get_counter();

    assert!(current_counter == init_counter + 1, "Counter increment failed");

    let expected_event = CounterChanged {
        caller: user_owner(),
        old_value: init_counter,
        new_value: init_counter + 1,
        reason: ChangeReason::Increased,
    };

    spy.assert_emitted(@array![
        (dispatcher.contract_address, Event::CounterChange(expected_event))
    ]);
}

#[test]
fn test_decrement_counter() {
    let init_counter: u32 = 5;
    let (contract_address, dispatcher) = deploy_counter(init_counter);
    let mut spy = spy_events();

    start_cheat_caller_address(contract_address, user_owner());
    dispatcher.decrease_counter();
    stop_cheat_caller_address(contract_address);

    let current_counter = dispatcher.get_counter();

    assert!(current_counter == init_counter - 1, "Counter decrement failed");

    let expected_event = CounterChanged {
        caller: user_owner(),
        old_value: init_counter,
        new_value: init_counter - 1,
        reason: ChangeReason::Decreased,
    };

    spy.assert_emitted(@array![
        (dispatcher.contract_address, Event::CounterChange(expected_event))
    ]);
}

#[test]
#[should_panic]
fn test_decrement_below_zero() {
    let init_counter: u32 = 0;
    let (_, dispatcher) = deploy_counter(init_counter);
    dispatcher.decrease_counter();
}

#[test]
fn test_set_counter_owner() {
    let init_counter: u32 = 5;
    let (contract_address, dispatcher) = deploy_counter(init_counter);
    let mut spy = spy_events();
    
    let new_value: u32 = 15;
    start_cheat_caller_address(contract_address, user_owner());
    dispatcher.set_counter(new_value);
    stop_cheat_caller_address(contract_address);

    assert!(dispatcher.get_counter() == new_value, "The owner is unable to reset the counter");

    let expected_event = CounterChanged {
        caller: user_owner(),
        old_value: init_counter,
        new_value: new_value,
        reason: ChangeReason::Set,
    };

    spy.assert_emitted(@array![
        (dispatcher.contract_address, Event::CounterChange(expected_event))
    ]);
}

#[test]
#[should_panic(expected: ('Caller is not the owner',))]
fn test_set_counter_non_owner(
) {
    let init_counter: u32 = 5;
    let (_, dispatcher) = deploy_counter(init_counter);
    let new_value: u32 = 15;
    dispatcher.set_counter(new_value);
}

#[test]
#[should_panic(expected: "Caller does not have enough balance")]
fn test_reset_counter_not_enough_balance() {
    let init_counter: u32 = 8;
    let (contract_address, dispatcher) = deploy_counter(init_counter);

    set_balance(user_owner(), 0, Token::STRK);
    
    start_cheat_caller_address(contract_address, user_owner());
    dispatcher.reset_counter();
    stop_cheat_caller_address(contract_address);
}

#[test]
#[should_panic(expected: "Caller does not have enough allowance")]
fn test_reset_counter_not_approved_balance() {
    let init_counter: u32 = 8;
    let (contract_address, dispatcher) = deploy_counter(init_counter);

    let caller = user_owner();
    set_balance(caller, strk_to_fri(10), Token::STRK);

    start_cheat_caller_address(contract_address, user_owner());
    dispatcher.reset_counter();
    stop_cheat_caller_address(contract_address);
}

#[test]
fn test_reset_counter_good() {
    let init_counter: u32 = 8;
    let contract_user: ContractAddress = 'user'.try_into().unwrap();
    let (contract_address, dispatcher) = deploy_counter(init_counter);
    let mut spy = spy_events();

    let strk_dispatcher = IERC20Dispatcher {
        contract_address: strk_address(),
    };
    
    // Устанавливаем баланс ERC20 токенов для пользователя
    store(
        strk_address(), 
        map_entry_address(selector!("ERC20_balances"), 
        array![contract_user.into()].span()), 
        array![10000000000000000000.try_into().unwrap()].span()
    );

    start_cheat_caller_address(strk_address(), contract_user);
    strk_dispatcher.approve(contract_address, 1000000000000000000);
    stop_cheat_caller_address(strk_address());
    
    assert!(strk_dispatcher.balance_of(contract_user) == 10000000000000000000, "The owner balance is incorrect");
    assert!(strk_dispatcher.allowance(contract_user, contract_address) == 1000000000000000000, "The allowance is incorrect");
    
    start_cheat_caller_address(contract_address, contract_user);
    dispatcher.reset_counter();
    stop_cheat_caller_address(contract_address);
    
    assert!(dispatcher.get_counter() == 0, "The counter is not reset");
    assert!(strk_dispatcher.allowance(user_owner(), contract_address) == 0, "The allowance after tx incorrect");

    let expected_event = CounterChanged {
        caller: contract_user,
        old_value: init_counter,
        new_value: 0,
        reason: ChangeReason::Reset,
    };

    spy.assert_emitted(@array![
        (dispatcher.contract_address, Event::CounterChange(expected_event))
    ]);

    assert!(strk_dispatcher.balance_of(user_owner()) == 1000000000000000000, "The owner balance should be 1");
    assert!(strk_dispatcher.balance_of(contract_user) == 9000000000000000000, "The user balance should be 9");
}