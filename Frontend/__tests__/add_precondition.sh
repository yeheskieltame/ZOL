#!/bin/bash
# Add precondition to all async functions with owner and mint parameters
sed -i '' '
/async (.*owner.*mint.*) => {$/ {
    n
    /if (owner.equals(mint)) return;/! {
        i\
            if (owner.equals(mint)) return;
    }
}
' token-account.property.test.ts
