package com.autowash.loyalty;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.User;
import com.autowash.entity.Voucher;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.VoucherRepository;
import com.autowash.repository.VoucherTierRepository;
import com.autowash.shared.security.UserPrincipal;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class CustomerVoucherControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LoyaltyAccountRepository loyaltyAccountRepository;

    @Autowired
    private VoucherRepository voucherRepository;

    @Autowired
    private VoucherTierRepository voucherTierRepository;

    @Test
    void customerCanListVouchersMatchingTheirTier() throws Exception {
        // Create vouchers
        Voucher publicVoucher = new Voucher("PUB10", "Public 10", DiscountType.PERCENT, 10, 0, null, null, false, Instant.now().minusSeconds(3600), Instant.now().plusSeconds(3600), ActiveStatus.ACTIVE);
        voucherRepository.saveAndFlush(publicVoucher);

        Voucher goldVoucher = new Voucher("GOLD20", "Gold 20", DiscountType.PERCENT, 20, 0, null, null, false, Instant.now().minusSeconds(3600), Instant.now().plusSeconds(3600), ActiveStatus.ACTIVE);
        voucherRepository.saveAndFlush(goldVoucher);
        voucherTierRepository.saveAndFlush(new VoucherTier(goldVoucher.getId(), LoyaltyTier.GOLD));
        voucherTierRepository.saveAndFlush(new VoucherTier(goldVoucher.getId(), LoyaltyTier.DIAMOND));

        // Create Bronze Customer
        User bronzeUser = createActiveCustomer("0901777991");
        mockMvc.perform(get("/api/v1/vouchers/active")
                        .with(authenticatedCustomer(bronzeUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItem("PUB10")))
                .andExpect(jsonPath("$.data[*].code", not(hasItem("GOLD20"))));

        // Create Gold Customer
        User goldUser = createActiveCustomer("0901777992");
        LoyaltyAccount goldAccount = loyaltyAccountRepository.findByCustomerId(goldUser.getId()).orElseThrow();
        goldAccount.updateTier(LoyaltyTier.GOLD);
        loyaltyAccountRepository.saveAndFlush(goldAccount);

        mockMvc.perform(get("/api/v1/vouchers/active")
                        .with(authenticatedCustomer(goldUser)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].code", hasItem("PUB10")))
                .andExpect(jsonPath("$.data[*].code", hasItem("GOLD20")));
    }

    private User createActiveCustomer(String phone) {
        User user = new User("Test Customer", phone, phone + "@example.com", "hash");
        user.activate();
        User savedUser = userRepository.saveAndFlush(user);
        loyaltyAccountRepository.findByCustomerId(savedUser.getId())
                .orElseGet(() -> loyaltyAccountRepository.saveAndFlush(new LoyaltyAccount(savedUser)));
        return savedUser;
    }

    private org.springframework.test.web.servlet.request.RequestPostProcessor authenticatedCustomer(User user) {
        UserPrincipal principal = new UserPrincipal(user);
        UsernamePasswordAuthenticationToken token =
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities());
        return authentication(token);
    }
}
