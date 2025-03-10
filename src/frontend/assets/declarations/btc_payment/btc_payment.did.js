export const idlFactory = ({ IDL }) => {
  return IDL.Service({
    'createPaymentRequest': IDL.Func(
      [IDL.Nat64, IDL.Text, IDL.Text],
      [IDL.Text],
      [],
    ),
    'getPaymentDetails': IDL.Func(
      [IDL.Text],
      [
        IDL.Opt(
          IDL.Record({
            'amount': IDL.Nat64,
            'memo': IDL.Text,
            'payer': IDL.Principal,
            'recipient': IDL.Text,
            'status': IDL.Text,
            'timestamp': IDL.Int,
          })
        ),
      ],
      ['query'],
    ),
    'healthCheck': IDL.Func([], [IDL.Bool], ['query']),
    'listUserPayments': IDL.Func(
      [IDL.Principal],
      [
        IDL.Vec(
          IDL.Tuple(
            IDL.Text,
            IDL.Record({
              'amount': IDL.Nat64,
              'memo': IDL.Text,
              'payer': IDL.Principal,
              'recipient': IDL.Text,
              'status': IDL.Text,
              'timestamp': IDL.Int,
            })
          )
        ),
      ],
      ['query'],
    ),
    'updatePaymentStatus': IDL.Func([IDL.Text, IDL.Text], [IDL.Bool], []),
  });
};

export const init = ({ IDL }) => { return []; };
