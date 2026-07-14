package com.autowash.loyalty;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.autowash.entity.LoyaltyAccount;
import com.autowash.entity.User;
import com.autowash.entity.VoucherTemplate;
import com.autowash.entity.VoucherTier;
import com.autowash.entity.enums.ActiveStatus;
import com.autowash.entity.enums.DiscountType;
import com.autowash.entity.enums.LoyaltyTier;
import com.autowash.entity.enums.UserStatus;
import com.autowash.repository.LoyaltyAccountRepository;
import com.autowash.repository.UserRepository;
import com.autowash.repository.VoucherTemplateRepository;
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
    private VoucherTemplateRepository voucherTemplateRepository;

    @Autowired
    private VoucherTierRepository voucherTierRepository;

    @Test
    void customerCanListVouchersMatchingTheirTier() throws Exception {
        // Create vouchers
        VoucherTemplate publicVoucher = new VoucherTemplate("PUB10", "Public 10", "Desc", DiscountType.PERCENT, 10, 0, null, 0, 7, null, false, Instant.now().minusSeconds(3600), Instant.now().plusSeconds(3600), ActiveStatus.ACTIVE);
        voucherTemplateRepository.saveAndFlush(publicVoucher);

        VoucherTemplate goldVoucher = new VoucherTemplate("GOLD20", "Gold 20", "Desc", DiscountType.PERCENT, 20, 0, null, 0, 7, null, false, Instant.now().minusSeconds(3600), Instant.now().plusSeconds(3600), ActiveStatus.ACTIVE);
        voucherTemplateRepository.saveAndFlush(goldVoucher);
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

    @Test
    void blockedCustomerCannotClaimPointsVoucher() throws Exception {
        VoucherTemplate pointsVoucher = new VoucherTemplate(
                "BLOCKED50",
                "Blocked Claim Test",
                "Desc",
                DiscountType.FIXED_AMOUNT,
                50_000,
                0,
                null,
                100,
                7,
                null,
                false,
                Instant.now().minusSeconds(3600),
                Instant.now().plusSeconds(3600),
                ActiveStatus.ACTIVE
        );
        voucherTemplateRepository.saveAndFlush(pointsVoucher);

        User customer = createActiveCustomer("0901777993");
        LoyaltyAccount account = loyaltyAccountRepository.findByCustomerId(customer.getId()).orElseThrow();
        account.addPoints(150);
        loyaltyAccountRepository.saveAndFlush(account);
        customer.updateStatus(UserStatus.BLOCKED);
        userRepository.saveAndFlush(customer);

        mockMvc.perform(post("/api/v1/vouchers/{voucherTemplateId}/claim", pointsVoucher.getId())
                        .with(authenticatedCustomer(customer)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.errorCode").value("ACCOUNT_BLOCKED"));
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
