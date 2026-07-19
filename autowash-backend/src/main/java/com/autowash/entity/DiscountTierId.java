package com.autowash.entity;

import java.io.Serializable;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode
public class DiscountTierId implements Serializable {
    private UUID discount;
    private String tier;
}
